using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Table;
using QFSWeb.Encryption;
using QFSWeb.Models;
using System;
using System.Collections.Generic;
using System.Web.Configuration;
using System.Linq;
using QFSWeb.Utilities;
using System.Threading.Tasks;
using QFSWeb.Interface;

namespace QFSWeb
{
    //TODO:Use a better name.
    public class CredentialManager
    {
        public List<AppInstance> GetAppInstances(string spHostWebDomain)
        {
            var table = GetTableStorage(ApplicationConstants.AzureStorage.StorageConnectionString, ApplicationConstants.AzureStorage.TableStorageKey);

            if (!table.Exists())
            {
                table.CreateIfNotExists();
                return new List<AppInstance>();
            }

            // Construct the query operation for all customer entities where PartitionKey="Smith".
            var query = new TableQuery<AppInstanceEntity>()
                .Where(TableQuery.GenerateFilterCondition("PartitionKey", QueryComparisons.Equal, spHostWebDomain));

            // Print the fields for each customer.

            var appInstances = table.ExecuteQuery(query)
                .Select(entity => new AppInstance(entity))
                .ToList();

            return appInstances;
        }

        private static AppInstanceEntity GetAppInstanceEntity(string instanceId, string spHostWebDomain)
        {
            var table = CredentialManager.GetTableStorage(ApplicationConstants.AzureStorage.StorageConnectionString, ApplicationConstants.AzureStorage.TableStorageKey);

            if (table == null)
            {
                return null;
            }

            // Create a retrieve operation that takes a Dbxlnstance entity.
            var retrieveOperation = TableOperation.Retrieve<AppInstanceEntity>(spHostWebDomain, instanceId);

            // Execute the operation.
            var tableResult = table.Execute(retrieveOperation);

            if (tableResult == null)
            {
                return null;
            }

            // Assign the result to a DbxlInstanceEntity object.
            var entity = tableResult.Result as AppInstanceEntity;

            return entity;
        }

        public AppInstance GetAppInstanceById(string instanceId, string spHostWebDomain)
        {
            var entity = GetAppInstanceEntity(instanceId, spHostWebDomain);

            if (entity == null)
            {
                return null;
            }

            var instance = new AppInstance(entity);

            return instance;
        }

        public bool SaveOrUpdateAppInstance(AppInstance instance, string spHostWebDomain)
        {
            try
            {
                AppInstanceEntity updateEntity = null;

                var table = CredentialManager.GetTableStorage(ApplicationConstants.AzureStorage.StorageConnectionString, ApplicationConstants.AzureStorage.TableStorageKey);

                if (!String.IsNullOrWhiteSpace(instance.InstanceId))
                {
                    // Create a retrieve operation that takes a Dbxlnstance entity.
                    var retrieveOperation = TableOperation.Retrieve<AppInstanceEntity>(instance.O365Domain, instance.InstanceId);

                    // Execute the operation.
                    TableResult retrievedResult = table.Execute(retrieveOperation);

                    // Assign the result to a DbxlInstanceEntity object.
                    updateEntity = retrievedResult.Result as AppInstanceEntity;
                }

                if (updateEntity == null)
                {
                    updateEntity = new AppInstanceEntity(Guid.NewGuid().ToString(), spHostWebDomain);
                }

                updateEntity.InstanceName = instance.InstanceName;
                updateEntity.ServiceURL = instance.ServiceURL;

                if (!String.IsNullOrWhiteSpace(instance.Username))
                {
                    updateEntity.Username = CredentialManager.EncryptData(instance.Username);
                }

                if (!String.IsNullOrWhiteSpace(instance.Password))
                {
                    updateEntity.Password = CredentialManager.EncryptData(instance.Password);
                }

                updateEntity.Domain = instance.Domain;

                // Create the InsertOrReplace TableOperation
                var tableOperation = TableOperation.InsertOrReplace(updateEntity);

                // Execute the operation.
                table.Execute(tableOperation);

                return true;
            }
            catch
            {
                return false;
            }
        }

        private static CloudTable GetTableStorage(string connectionString, string tableName)
        {
            return StorageHelper.GetTable(tableName, connectionString);
        }

        private static string EncryptData(string plainText)
        {
            // Before encrypting data, we will append plain text to a random
            // salt value, which will be between 4 and 8 bytes long (implicitly
            // used defaults).
            RijndaelEncryption rijndaelKey = new RijndaelEncryption(ApplicationConstants.RijndaelConst.PassPhrase, ApplicationConstants.RijndaelConst.InitVector);

            return rijndaelKey.Encrypt(plainText);
        }

        public static string DecryptData(string cipherText)
        {
            // Before encrypting data, we will append plain text to a random
            // salt value, which will be between 4 and 8 bytes long (implicitly
            // used defaults).
            RijndaelEncryption rijndaelKey = new RijndaelEncryption(ApplicationConstants.RijndaelConst.PassPhrase, ApplicationConstants.RijndaelConst.InitVector);

            return rijndaelKey.Decrypt(cipherText);
        }

        public AppInstance GetMatchingInstanceByUrl(string requestUrl)
        {
            var instanceList = GetAppInstances(SpManager.GetRealm());
            if (instanceList == null)
            {
                return null;
            }

            var matchedInstances = instanceList
                .Where(instance => !String.IsNullOrWhiteSpace(instance.ServiceURL) &&
                    requestUrl.IndexOf(instance.ServiceURL, StringComparison.InvariantCultureIgnoreCase) == 0)
                .OrderByDescending(instance => instance.ServiceURL.Length);

            if (!matchedInstances.Any())
            {
                return null;
            }

            var matchedInstance = matchedInstances.First();

            matchedInstance.InitializeCredentials();

            return matchedInstance;
        }

        public async Task<bool> DeleteAppInstance(string instanceId, string spHostWebDomain)
        {
            try
            {
                var table = GetTableStorage(ApplicationConstants.AzureStorage.StorageConnectionString, ApplicationConstants.AzureStorage.TableStorageKey);
                if (table == null)
                {
                    return false;
                }

                var instanceEntity = GetAppInstanceEntity(instanceId, spHostWebDomain);
                if (instanceEntity == null)
                {
                    return false;
                }

                await table.ExecuteAsync(TableOperation.Delete(instanceEntity));
                return true;
            }
            catch
            {
                return false;
            }

        }
    }
}