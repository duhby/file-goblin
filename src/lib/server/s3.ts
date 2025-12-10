import { S3Client } from "@aws-sdk/client-s3";
import {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
  AWS_ENDPOINT,
} from "$env/static/private";

export const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
  ...(AWS_ENDPOINT && {
    endpoint: AWS_ENDPOINT,
    forcePathStyle: true,
  }),
});
