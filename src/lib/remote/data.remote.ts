import { command, query } from "$app/server";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import * as v from "valibot";
import { error } from "@sveltejs/kit";
import { s3Client } from "$lib/server/s3";
import { db } from "$lib/server/db";
import { file, tag, hasTag, subtagOf } from "$lib/server/db/schema";
import { auth } from "$lib/auth";
import { getRequestEvent } from "$app/server";
import { BB_S3_BUCKET } from "$env/static/private";
import { nanoid } from "nanoid";
import { eq, and, ilike, inArray, or } from "drizzle-orm";

const UploadRequestSchema = v.object({
  filename: v.pipe(v.string(), v.nonEmpty("Filename is required")),
  contentType: v.pipe(v.string(), v.nonEmpty("Content type is required")),
  fileType: v.picklist(["image", "video", "link"], "Invalid file type"),
});

export const createUploadUrl = query(UploadRequestSchema, async (data) => {
  const event = getRequestEvent();

  const session = await auth.api.getSession({
    headers: event.request.headers,
  });

  if (!session?.user) {
    error(401, "Unauthorized");
  }

  const fileId = nanoid(10);

  // Don't create database entry yet - will be created in finalizeUpload after S3 upload succeeds
  const command = new PutObjectCommand({
    Bucket: BB_S3_BUCKET,
    Key: fileId,
    ContentType: data.contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 3600,
  });

  return {
    uploadUrl,
    fileId,
    message: "Upload URL created successfully",
  };
});

const FinalizeUploadSchema = v.object({
  fileId: v.pipe(v.string(), v.nonEmpty("File ID is required")),
  filename: v.pipe(v.string(), v.nonEmpty("Filename is required")),
  fileType: v.picklist(["image", "video", "link"], "Invalid file type"),
  tagIds: v.optional(v.array(v.string())),
});

export const finalizeUpload = command(FinalizeUploadSchema, async (data) => {
  const event = getRequestEvent();

  const session = await auth.api.getSession({
    headers: event.request.headers,
  });

  if (!session?.user) {
    error(401, "Unauthorized");
  }

  // Create the file entry in the database
  await db.insert(file).values({
    id: data.fileId,
    userId: session.user.id,
    name: data.filename,
    type: data.fileType,
  });

  // Associate tags if provided
  if (data.tagIds && data.tagIds.length > 0) {
    // Verify all tags belong to the user
    const userTags = await db
      .select()
      .from(tag)
      .where(and(inArray(tag.id, data.tagIds), eq(tag.userId, session.user.id)));

    if (userTags.length !== data.tagIds.length) {
      error(400, "One or more tags are invalid or do not belong to the user");
    }

    // Create tag associations
    const tagAssociations = data.tagIds.map((tagId) => ({
      file: data.fileId,
      tag: tagId,
    }));

    await db.insert(hasTag).values(tagAssociations);
  }

  return { message: "Upload finalized successfully" };
});

const GetFilesSchema = v.optional(
  v.object({
    tagId: v.optional(v.string()),
    tagIds: v.optional(v.array(v.string())),
    search: v.optional(v.string()),
  }),
);

export const getFiles = query(GetFilesSchema, async (params) => {
  const event = getRequestEvent();

  const session = await auth.api.getSession({
    headers: event.request.headers,
  });

  if (!session?.user) {
    error(401, "Unauthorized");
  }

  let conditions = [eq(file.userId, session.user.id)];

  // If searching by tag(s), filter files that have the specific tag(s)
  if (params?.tagId) {
    const filesWithTag = await db
      .select({ fileId: hasTag.file })
      .from(hasTag)
      .where(eq(hasTag.tag, params.tagId));

    const fileIds = filesWithTag.map((f) => f.fileId).filter((id): id is string => id !== null);

    if (fileIds.length === 0) {
      return [];
    }

    conditions.push(inArray(file.id, fileIds));
  } else if (params?.tagIds && params.tagIds.length > 0) {
    // Find files that have ALL of the selected tags
    const filesWithTags = await db
      .select({ fileId: hasTag.file })
      .from(hasTag)
      .where(inArray(hasTag.tag, params.tagIds));

    // Count how many times each file appears (should equal params.tagIds.length for files with all tags)
    const fileIdCounts = new Map<string, number>();
    for (const row of filesWithTags) {
      if (row.fileId) {
        fileIdCounts.set(row.fileId, (fileIdCounts.get(row.fileId) || 0) + 1);
      }
    }

    // Only include files that have all the selected tags
    const fileIds = Array.from(fileIdCounts.entries())
      .filter(([_, count]) => count === params.tagIds!.length)
      .map(([fileId, _]) => fileId);

    if (fileIds.length === 0) {
      return [];
    }

    conditions.push(inArray(file.id, fileIds));
  }

  // If searching by name
  if (params?.search) {
    conditions.push(ilike(file.name, `%${params.search}%`));
  }

  const userFiles = await db
    .select()
    .from(file)
    .where(and(...conditions))
    .orderBy(file.id);

  // Fetch tags for each file
  const filesWithTags = await Promise.all(
    userFiles.map(async (f) => {
      const fileTags = await db
        .select({
          id: tag.id,
          name: tag.name,
          color: tag.color,
        })
        .from(hasTag)
        .innerJoin(tag, eq(tag.id, hasTag.tag))
        .where(eq(hasTag.file, f.id));

      return {
        ...f,
        tags: fileTags,
      };
    }),
  );

  return filesWithTags;
});

export const deleteFile = command(v.string(), async (fileId) => {
  const session = await auth.api.getSession({
    headers: getRequestEvent().request.headers,
  });

  if (!session?.user) error(401, "Unauthorized");

  const dbFile = await db.select().from(file).where(eq(file.id, fileId));
  if (dbFile.length == 0) error(404, "File not found");
  if (dbFile[0].userId != session.user.id) error(401, "Unauthorized");

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BB_S3_BUCKET,
      Key: fileId,
    }),
  );

  await db.delete(file).where(eq(file.id, fileId));
});

// Tag management functions

export const getTags = query(async () => {
  const event = getRequestEvent();

  const session = await auth.api.getSession({
    headers: event.request.headers,
  });

  if (!session?.user) {
    error(401, "Unauthorized");
  }

  const userTags = await db
    .select()
    .from(tag)
    .where(eq(tag.userId, session.user.id))
    .orderBy(tag.name);

  return userTags;
});

const CreateTagSchema = v.object({
  name: v.pipe(v.string(), v.nonEmpty("Tag name is required")),
  color: v.optional(
    v.pipe(v.string(), v.regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code")),
  ),
});

export const createTag = command(CreateTagSchema, async (data) => {
  const session = await auth.api.getSession({
    headers: getRequestEvent().request.headers,
  });

  if (!session?.user) error(401, "Unauthorized");

  const tagId = nanoid(10);

  await db.insert(tag).values({
    id: tagId,
    userId: session.user.id,
    name: data.name,
    color: data.color ?? "#ffffff",
  });

  return { tagId, message: "Tag created successfully" };
});

const UpdateTagSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty("Tag ID is required")),
  name: v.optional(v.pipe(v.string(), v.nonEmpty("Tag name cannot be empty"))),
  color: v.optional(
    v.pipe(v.string(), v.regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code")),
  ),
});

export const updateTag = command(UpdateTagSchema, async (data) => {
  const session = await auth.api.getSession({
    headers: getRequestEvent().request.headers,
  });

  if (!session?.user) error(401, "Unauthorized");

  const dbTag = await db.select().from(tag).where(eq(tag.id, data.id));
  if (dbTag.length === 0) error(404, "Tag not found");
  if (dbTag[0].userId !== session.user.id) error(401, "Unauthorized");

  const updates: { name?: string; color?: string } = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.color !== undefined) updates.color = data.color;

  if (Object.keys(updates).length === 0) {
    return { message: "No updates provided" };
  }

  await db.update(tag).set(updates).where(eq(tag.id, data.id));

  return { message: "Tag updated successfully" };
});

export const deleteTag = command(v.string(), async (tagId) => {
  const session = await auth.api.getSession({
    headers: getRequestEvent().request.headers,
  });

  if (!session?.user) error(401, "Unauthorized");

  const dbTag = await db.select().from(tag).where(eq(tag.id, tagId));
  if (dbTag.length === 0) error(404, "Tag not found");
  if (dbTag[0].userId !== session.user.id) error(401, "Unauthorized");

  await db.delete(tag).where(eq(tag.id, tagId));

  return { message: "Tag deleted successfully" };
});

// Tag hierarchy management functions

const MAX_TAG_DEPTH = 5;

// Helper function to check if adding a parent would create a circular dependency
async function wouldCreateCircularDependency(
  childId: string,
  parentId: string,
  userId: string,
): Promise<boolean> {
  // Check if parentId is a descendant of childId
  const visited = new Set<string>();
  const queue: string[] = [childId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;

    if (currentId === parentId) {
      return true; // Found a cycle
    }

    if (visited.has(currentId)) {
      continue;
    }

    visited.add(currentId);

    // Get all children of current tag
    const children = await db
      .select({ childId: subtagOf.child })
      .from(subtagOf)
      .innerJoin(tag, eq(tag.id, subtagOf.child))
      .where(and(eq(subtagOf.parent, currentId), eq(tag.userId, userId)));

    for (const child of children) {
      if (child.childId) {
        queue.push(child.childId);
      }
    }
  }

  return false;
}

// Helper function to calculate the depth of a tag in the hierarchy
async function getTagDepth(tagId: string, userId: string): Promise<number> {
  let depth = 0;
  let currentId: string | null = tagId;

  const visited = new Set<string>();

  while (currentId && depth < MAX_TAG_DEPTH + 1) {
    if (visited.has(currentId)) {
      // Circular reference detected (shouldn't happen with our checks, but safety)
      break;
    }

    visited.add(currentId);

    // Get parent of current tag
    const parent = await db
      .select({ parentId: subtagOf.parent })
      .from(subtagOf)
      .innerJoin(tag, eq(tag.id, subtagOf.parent))
      .where(and(eq(subtagOf.child, currentId), eq(tag.userId, userId)))
      .limit(1);

    if (parent.length === 0) {
      break; // No parent found, we're at the root
    }

    currentId = parent[0].parentId;
    depth++;
  }

  return depth;
}

const SetTagParentSchema = v.object({
  childId: v.pipe(v.string(), v.nonEmpty("Child tag ID is required")),
  parentId: v.pipe(v.string(), v.nonEmpty("Parent tag ID is required")),
});

export const setTagParent = command(SetTagParentSchema, async (data) => {
  const session = await auth.api.getSession({
    headers: getRequestEvent().request.headers,
  });

  if (!session?.user) error(401, "Unauthorized");

  // Verify both tags exist and belong to the user
  const [childTag, parentTag] = await Promise.all([
    db.select().from(tag).where(eq(tag.id, data.childId)),
    db.select().from(tag).where(eq(tag.id, data.parentId)),
  ]);

  if (childTag.length === 0) error(404, "Child tag not found");
  if (parentTag.length === 0) error(404, "Parent tag not found");
  if (childTag[0].userId !== session.user.id) error(401, "Unauthorized");
  if (parentTag[0].userId !== session.user.id) error(401, "Unauthorized");

  // Check if child and parent are the same
  if (data.childId === data.parentId) {
    error(400, "A tag cannot be its own parent");
  }

  // Check for circular dependencies
  const wouldCreateCycle = await wouldCreateCircularDependency(
    data.childId,
    data.parentId,
    session.user.id,
  );

  if (wouldCreateCycle) {
    error(400, "This would create a circular dependency in the tag hierarchy");
  }

  // Check depth limit - the parent's depth + 1 must not exceed MAX_TAG_DEPTH
  const parentDepth = await getTagDepth(data.parentId, session.user.id);

  if (parentDepth >= MAX_TAG_DEPTH) {
    error(
      400,
      `Maximum tag depth of ${MAX_TAG_DEPTH} would be exceeded. Parent is already at depth ${parentDepth}.`,
    );
  }

  // Remove any existing parent relationship for the child
  await db.delete(subtagOf).where(eq(subtagOf.child, data.childId));

  // Create the new parent-child relationship
  await db.insert(subtagOf).values({
    parent: data.parentId,
    child: data.childId,
  });

  return { message: "Tag parent set successfully" };
});

export const removeTagParent = command(v.string(), async (childId) => {
  const session = await auth.api.getSession({
    headers: getRequestEvent().request.headers,
  });

  if (!session?.user) error(401, "Unauthorized");

  // Verify the tag exists and belongs to the user
  const childTag = await db.select().from(tag).where(eq(tag.id, childId));

  if (childTag.length === 0) error(404, "Tag not found");
  if (childTag[0].userId !== session.user.id) error(401, "Unauthorized");

  // Remove the parent relationship
  const result = await db.delete(subtagOf).where(eq(subtagOf.child, childId));

  return { message: "Tag parent removed successfully" };
});

export const getTagHierarchy = query(async () => {
  const event = getRequestEvent();

  const session = await auth.api.getSession({
    headers: event.request.headers,
  });

  if (!session?.user) {
    error(401, "Unauthorized");
  }

  // Get all tags for the user
  const userTags = await db
    .select()
    .from(tag)
    .where(eq(tag.userId, session.user.id))
    .orderBy(tag.name);

  // Get all hierarchy relationships for the user's tags
  const tagIds = userTags.map((t) => t.id);

  if (tagIds.length === 0) {
    return { tags: [], relationships: [] };
  }

  const relationships = await db
    .select({
      parentId: subtagOf.parent,
      childId: subtagOf.child,
    })
    .from(subtagOf)
    .where(and(inArray(subtagOf.parent, tagIds), inArray(subtagOf.child, tagIds)));

  return {
    tags: userTags,
    relationships: relationships,
  };
});
