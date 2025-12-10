import { command, query } from "$app/server";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import * as v from "valibot";
import { error } from "@sveltejs/kit";
import { s3Client } from "$lib/server/s3";
import { db } from "$lib/server/db";
import { file } from "$lib/server/db/schema";
import { auth } from "$lib/auth";
import { getRequestEvent } from "$app/server";
import { BB_S3_BUCKET } from "$env/static/private";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

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

  await db.insert(file).values({
    id: fileId,
    userId: session.user.id,
    name: data.filename,
    type: data.fileType,
  });

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

export const getFiles = query(async () => {
  const event = getRequestEvent();

  const session = await auth.api.getSession({
    headers: event.request.headers,
  });

  if (!session?.user) {
    error(401, "Unauthorized");
  }

  const userFiles = await db.query.file.findMany({
    where: (files, { eq }) => eq(files.userId, session.user.id),
    orderBy: (files, { desc }) => [desc(files.id)],
  });

  return userFiles;
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
