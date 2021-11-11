/**
 * name : generics/files-helper.js
 * author : Aman Gupta
 * created-date : 09-Nov-2021
 * Description : cloud services helpers methods.
*/

const path = require('path');
const fs = require('fs');

const { Storage } = require('@google-cloud/storage');
const S3 = require('aws-sdk/clients/s3');
const { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } = require('@azure/storage-blob');

module.exports = class FilesHelper {

    /**
      * Upload file to GCP 
      * @method
      * @name uploadFileInGcp
      * @param  {filePath} filePath - Stored file path in file system.
      * @param  {destFileName} destFileName - fileName to be saved in gc
      * @param  {bucketName} bucketName - cloud storage location in which file gets saved
      * @returns {JSON} - Upload result.
    */
    static async uploadFileInGcp(filePath, destFileName, bucketName) {
        const storage = new Storage({
            projectId: process.env.GCP_PROJECT_ID,
            keyFilename: path.join(__dirname, '../', process.env.GCP_PATH)
        });
        bucketName = bucketName || process.env.DEFAULT_GCP_BUCKET_NAME;
        try {
            const uploadedFile = await storage.bucket(bucketName).upload(filePath, {
                destination: destFileName,
                metadata: {}
            });
            return uploadedFile[0].metadata;
        } catch (error) {
            error = new Error(error.response.data.error_description);
            error.statusCode = 500;
            throw error;
        }

    }

    /**
      * Upload file to AWS
      * @method
      * @name uploadFileInAws
      * @param  {filePath} filePath - Stored file path in file system.
      * @param  {destFileName} destFileName - fileName to be saved in aws
      * @param  {bucketName} bucketName - cloud storage location in which file gets saved
      * @returns {JSON} - Upload result.
    */
    static async uploadFileInAws(filePath, destFileName, bucketName) {
        const s3 = new S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            signatureVersion: 'v4',
            region: process.env.AWS_BUCKET_REGION
        });
        bucketName = bucketName || process.env.DEFAULT_AWS_BUCKET_NAME;

        // Read content from the file as buffer
        const fileContent = fs.readFileSync(filePath);

        try {
            const uploadedFile = await s3.upload({
                Bucket: bucketName,
                Key: destFileName,
                Body: fileContent
            }).promise();
            return uploadedFile;
        } catch (error) {
            throw error;
        }

    }

    /**
      * Upload file to AZURE
      * @method
      * @name uploadFileInAzure
      * @param  {filePath} filePath - Stored file path in directory (project).
      * @param  {destFileName} destFileName - fileName to be saved in azure
      * @param  {containerName} containerName - cloud storage container in which file gets saved
      * @returns {JSON} - uploadedBlobResponse 
    */
    static async uploadFileInAzure(filePath, destFileName, containerName) {
        containerName = containerName || process.env.DEFAULT_AZURE_CONTAINER_NAME;

        const sharedKeyCredential = new StorageSharedKeyCredential(process.env.AZURE_ACCOUNT_NAME, process.env.AZURE_ACCOUNT_KEY);

        // Create the BlobServiceClient object which will be used to create a container client
        const blobServiceClient = new BlobServiceClient( // The storage account used via blobServiceClient
            `https://${process.env.AZURE_ACCOUNT_NAME}.blob.core.windows.net`,
            sharedKeyCredential
        );

        const containerClient = blobServiceClient.getContainerClient(containerName);
        // const content = fs.readFileSync(filePath);
        const blobName = destFileName;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        
        try {
            const uploadBlobResponse = await blockBlobClient.uploadFile(filePath);
            uploadBlobResponse.containerName = containerName;
            uploadBlobResponse.accountName = process.env.AZURE_ACCOUNT_NAME;
            return uploadBlobResponse;
        } catch (error) {
            error = new Error(error.message);
            error.statusCode = 500;
            throw error;
        }

    }

}

