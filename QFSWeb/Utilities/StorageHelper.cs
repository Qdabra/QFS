using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Mime;
using System.Threading.Tasks;
using System.Web;
using System.Web.Configuration;
using InfoPathServices;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Blob;
using Microsoft.WindowsAzure.Storage.Table;
using QFSWeb.Interface;

namespace QFSWeb.Utilities
{
    public class StorageHelper : IStorageHelper
    {
        internal static CloudStorageAccount GetStorageAccount(string connectionStringName)
        {
            var connectionString = WebConfigurationManager.ConnectionStrings[connectionStringName];

            if (connectionString == null)
            {
                throw new ApplicationException(string.Format("connection string {0} not available", connectionStringName));
            }

            return CloudStorageAccount.Parse(connectionString.ConnectionString);
        }

        internal static CloudTable GetTable(string tableName, string connectionStringName = ApplicationConstants.AzureStorage.StorageConnectionString)
        {
            // Retrieve the storage account from the connection string.
            var storageAccount = GetStorageAccount(connectionStringName);

            // Create the table client.
            CloudTableClient tableClient = storageAccount.CreateCloudTableClient();

            // Create the table if it doesn't exist.
            CloudTable table = tableClient.GetTableReference(tableName);

            return table;
        }

        internal static async Task<CloudBlobContainer> GetContainer(string containerName)
        {
            var storageAccount = GetStorageAccount(ApplicationConstants.AzureStorage.StorageConnectionString);

            var blobStorage = storageAccount.CreateCloudBlobClient();
            var container = blobStorage.GetContainerReference(containerName);
            if (await container.CreateIfNotExistsAsync())
            {
                var permissions = await container.GetPermissionsAsync();
                permissions.PublicAccess = BlobContainerPublicAccessType.Off;
                await container.SetPermissionsAsync(permissions);
            }

            return container;
        }

        internal static string GetContentType(string fileName)
        {
            return InfoPathServices.Utilities.GetContentType(fileName, MediaTypeNames.Text.Plain);
        }

        private static string EncodeBlobName(string fileName)
        {
            return HttpUtility.UrlEncode(fileName);
        }

        public async Task<BlobFileInfo> UploadFile(string containerName, Stream inputStream, string fileName = null)
        {
            var container = await GetContainer(containerName);

            fileName = Path.GetFileName(fileName);

            var blobName = EncodeBlobName(fileName);

            var blob = container.GetBlockBlobReference(blobName);

            blob.Properties.ContentType = GetContentType(fileName);

            await blob.UploadFromStreamAsync(inputStream);

            return new BlobFileInfo
            {
                BlobName = blobName,
                Container = containerName,
                FileName = fileName
            };
        }

        public async Task<BlobFileInfo> GetFileAsync(string containerName, string fileName)
        {
            var container = await GetContainer(containerName);

            var blob = container.GetBlockBlobReference(EncodeBlobName(fileName));

            if (blob == null) { return null; }

            var stream = new MemoryStream();
            await blob.DownloadToStreamAsync(stream);

            stream.Position = 0;

            return new BlobFileInfo
            {
                FileStream = stream,
                ContentType = blob.Properties.ContentType
            };
        }

        internal static async Task<bool> DeleteFileAsync(string containerName, string blobName)
        {
            var container = await GetContainer(containerName);

            var blob = container.GetBlockBlobReference(blobName);

            return await blob.DeleteIfExistsAsync();
        }

        public async Task DeleteContainer(string containerName)
        {
            var container = await GetContainer(containerName);

            await container.DeleteIfExistsAsync();
        }
    }

    public class BlobFileInfo
    {
        public string Container { get; set; }

        public string BlobName { get; set; }

        public string FileName { get; set; }

        public DateTime Added { get; set; }

        public Stream FileStream { get; set; }
        public string ContentType { get; set; }
    }
}