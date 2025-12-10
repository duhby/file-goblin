import { S3Client } from "@aws-sdk/client-s3";
import {
  BB_ACCESS_KEY_ID,
  BB_SECRET_ACCESS_KEY,
  BB_REGION,
  BB_ENDPOINT,
} from "$env/static/private";

export const s3Client = new S3Client({
  region: BB_REGION,
  credentials: {
    accessKeyId: BB_ACCESS_KEY_ID,
    secretAccessKey: BB_SECRET_ACCESS_KEY,
  },
  ...(BB_ENDPOINT && {
    endpoint: BB_ENDPOINT,
    forcePathStyle: true,
  }),
});
