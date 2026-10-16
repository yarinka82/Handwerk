import { saveFileToCloudinary } from './saveFileToCloudinary';

export type UploadedDocumentResult = {
  fileName: string;
  fileUrl: string;
  filePublicId: string;
  mimeType: string;
};
export const uploadDocumentsToCloudinary = async (
  files: Express.Multer.File[] | undefined,
): Promise<UploadedDocumentResult[]> => {
  const uploadedDocuments: UploadedDocumentResult[] = [];

  if (!files || files.length === 0) {
    return uploadedDocuments;
  }

  for (const file of files) {
    const uploadResult = await saveFileToCloudinary(file);

    uploadedDocuments.push({
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileUrl: uploadResult.secure_url,
      filePublicId: uploadResult.public_id,
    });
  }

  return uploadedDocuments;
};
