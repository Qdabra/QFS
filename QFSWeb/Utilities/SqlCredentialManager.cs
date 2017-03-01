using QFSWeb.Encryption;
using QFSWeb.Interface;
using QFSWeb.Models;
using QFSWeb.Models.SQLModels;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Web;

namespace QFSWeb.Utilities
{
    public class SqlCredentialManager
    {
        private const string QFSConnectionString = "QFSConnectionString";

        private const string EncryptionKey = "SSN_Key_Qdabra";

        public static string ConnectionString
        {
            get
            {
                var qfsConnectionString = ConfigurationManager.ConnectionStrings[QFSConnectionString];

                return qfsConnectionString == null ? null : qfsConnectionString.ConnectionString;
            }
        }

        public static List<AppInstance> GetAppInstances(string spHostWebDomain)
        {
            List<AppInstance> appInstances = new List<AppInstance>();

            using (var sqlConnection = new SqlConnection(ConnectionString))
            {
                StringBuilder commandText = new StringBuilder();
                commandText.AppendFormat("OPEN SYMMETRIC KEY {0} DECRYPTION BY CERTIFICATE QFSCredentials; ", EncryptionKey);
                commandText.Append("SELECT InstanceId, InstanceName, ServiceURL, Domain, O365Domain, CONVERT(nvarchar(255), DecryptByKey(Username)) AS 'Username', ");
                commandText.Append("CONVERT(nvarchar(255), DecryptByKey(Password, 1, HashBytes('SHA1', CONVERT(nvarchar, DecryptByKey(Username))))) As Password ");
                commandText.Append("FROM QFSCredentials WHERE O365Domain = @O365Domain");

                using (var sqlCommand = new SqlCommand(commandText.ToString(), sqlConnection))
                {
                    sqlCommand.Parameters.AddWithValue("@O365Domain", spHostWebDomain);

                    sqlConnection.Open();

                    using (SqlDataReader reader = sqlCommand.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            AppInstance appInstance = new AppInstance
                            {
                                InstanceId = Convert.ToString(reader["InstanceId"]),
                                InstanceName = Convert.ToString(reader["InstanceName"]),
                                ServiceURL = Convert.ToString(reader["ServiceURL"]),
                                Domain = Convert.ToString(reader["Domain"]),
                                O365Domain = Convert.ToString(reader["O365Domain"]),
                                EncryptedUsername = Convert.ToString(reader["Username"]),
                                EncryptedPassword = Convert.ToString(reader["Password"]),
                            };
                            appInstances.Add(appInstance);
                        }
                    }
                }
            }

            return appInstances;
        }

        private static AppInstanceModel GetAppInstanceEntity(string instanceId, string spHostWebDomain)
        {
            AppInstanceModel appInstance = new AppInstanceModel();

            using (var sqlConnection = new SqlConnection(ConnectionString))
            {
                StringBuilder commandText = new StringBuilder();
                commandText.AppendFormat("OPEN SYMMETRIC KEY {0} DECRYPTION BY CERTIFICATE QFSCredentials; ", EncryptionKey);
                commandText.Append("SELECT InstanceId, InstanceName, ServiceURL, Domain, O365Domain, CONVERT(nvarchar(255), DecryptByKey(Username)) AS 'Username', ");
                commandText.Append("CONVERT(nvarchar(255), DecryptByKey(Password, 1, HashBytes('SHA1', CONVERT(nvarchar, DecryptByKey(Username))))) As Password ");
                commandText.Append("FROM QFSCredentials WHERE O365Domain = @O365Domain and InstanceId = @InstanceId");

                //commandText.AppendFormat("OPEN SYMMETRIC KEY {0} DECRYPTION BY CERTIFICATE QFSCredentials; ", EncryptionKey);
                //commandText.Append("SELECT InstanceId, InstanceName, ServiceURL, Domain, O365Domain, CONVERT(varchar(255), DecryptByKey(Username)) AS 'Username', ");
                //commandText.Append("CONVERT(varchar, DecryptByKey(Password, 1, HashBytes('SHA1', CONVERT(varbinary, CONVERT(varchar(255), DecryptByKey(Username)))))) As Password ");
                //commandText.Append("FROM QFSCredentials WHERE O365Domain = @O365Domain and InstanceId = @InstanceId");

                using (var sqlCommand = new SqlCommand(commandText.ToString(), sqlConnection))
                {
                    sqlCommand.Parameters.AddWithValue("@O365Domain", spHostWebDomain);
                    sqlCommand.Parameters.AddWithValue("@InstanceId", instanceId);

                    sqlConnection.Open();

                    using (SqlDataReader reader = sqlCommand.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            appInstance.InstanceId = Convert.ToString(reader["InstanceId"]);
                            appInstance.InstanceName = Convert.ToString(reader["InstanceName"]);
                            appInstance.ServiceURL = Convert.ToString(reader["ServiceURL"]);
                            appInstance.Domain = Convert.ToString(reader["Domain"]);
                            appInstance.O365Domain = Convert.ToString(reader["O365Domain"]);
                            appInstance.Username = Convert.ToString(reader["Username"]);
                            appInstance.Password = Convert.ToString(reader["Password"]);
                        }
                    }
                }
            }

            return appInstance;
        }

        public static AppInstance GetAppInstanceById(string instanceId, string spHostWebDomain)
        {
            var entity = GetAppInstanceEntity(instanceId, spHostWebDomain);

            if (entity == null)
            {
                return null;
            }

            return new AppInstance(entity);
        }

        public static bool SaveOrUpdateAppInstance(AppInstance instance, string spHostWebDomain)
        {
            try
            {
                AppInstanceModel updateEntity = null;
                StringBuilder commandText = new StringBuilder();

                if (!String.IsNullOrWhiteSpace(instance.InstanceId))
                {
                    // Assign the result to a DbxlInstanceEntity object.
                    updateEntity = GetAppInstanceEntity(instance.InstanceId, instance.O365Domain);
                }

                //commandText = "OPEN SYMMETRIC KEY SSN_Key_01 DECRYPTION BY CERTIFICATE QFSCredentials;";

                if (updateEntity == null)
                {
                    commandText.AppendFormat("OPEN SYMMETRIC KEY {0} DECRYPTION BY CERTIFICATE QFSCredentials; ", EncryptionKey);
                    commandText.Append("INSERT INTO QFSCredentials VALUES(@O365Domain, @InstanceId, @InstanceName, ");
                    commandText.AppendFormat("EncryptByKey(Key_GUID('{0}'), @Password, 1, HashBytes('SHA1', CONVERT( nvarchar, @Username))), @ServiceURL, ", EncryptionKey);
                    commandText.AppendFormat("EncryptByKey(Key_GUID('{0}'), @Username), @Domain)", EncryptionKey);
                }
                else
                {
                    commandText.AppendFormat("OPEN SYMMETRIC KEY {0} DECRYPTION BY CERTIFICATE QFSCredentials; ", EncryptionKey);
                    commandText.Append("Update QFSCredentials Set InstanceName = @InstanceName, ");
                    commandText.AppendFormat("Password = EncryptByKey(Key_GUID('{0}'), @Password, 1, HashBytes('SHA1', CONVERT( nvarchar, @Username))), ServiceURL = @ServiceURL, ", EncryptionKey);
                    commandText.AppendFormat("Username = EncryptByKey(Key_GUID('{0}'), @Username), Domain = @Domain WHERE O365Domain = @O365Domain AND InstanceId = @InstanceId", EncryptionKey);
                }

                using (var sqlConnection = new SqlConnection(ConnectionString))
                {
                    using (var sqlCommandIOrU = new SqlCommand(commandText.ToString(), sqlConnection))
                    {
                        sqlConnection.Open();

                        sqlCommandIOrU.Parameters.AddWithValue("@InstanceId", updateEntity == null ? Guid.NewGuid().ToString() : updateEntity.InstanceId);
                        sqlCommandIOrU.Parameters.AddWithValue("@InstanceName", instance.InstanceName);
                        sqlCommandIOrU.Parameters.AddWithValue("@ServiceURL", instance.ServiceURL);
                        sqlCommandIOrU.Parameters.Add("@Username", SqlDbType.NVarChar, 255).Value = !String.IsNullOrWhiteSpace(instance.Username) ? EncryptData(instance.Username) : updateEntity.Username;
                        // sqlCommandIOrU.Parameters.AddWithValue("@Username", !String.IsNullOrWhiteSpace(instance.Username) ? EncryptData(instance.Username) : updateEntity.Username);
                        sqlCommandIOrU.Parameters.Add("@Password", SqlDbType.NVarChar, 255).Value = !String.IsNullOrWhiteSpace(instance.Password) ? EncryptData(instance.Password) : updateEntity.Password;
                        //sqlCommandIOrU.Parameters.AddWithValue("@Password", !String.IsNullOrWhiteSpace(instance.Password) ? EncryptData(instance.Password) : updateEntity.Password);
                        sqlCommandIOrU.Parameters.AddWithValue("@Domain", instance.Domain == null ? "" : instance.Domain);
                        sqlCommandIOrU.Parameters.AddWithValue("@O365Domain", updateEntity == null ? spHostWebDomain : updateEntity.O365Domain);

                        var cmdResult = sqlCommandIOrU.ExecuteNonQuery();
                    }
                }

                return true;
            }
            catch
            {
                return false;
            }
        }

        public static async Task<bool> IsAppInstanceExistAsync(AppInstance instance, string spHostWebDomain)
        {
            try
            {
                StringBuilder commandText = new StringBuilder("SELECT COUNT(*) FROM QFSCredentials");
                commandText.Append(" WHERE ((InstanceName = @InstanceName AND O365Domain = @O365Domain)");
                commandText.Append(" OR (ServiceURL= @ServiceURL AND O365Domain = @O365Domain))");
                if (!String.IsNullOrWhiteSpace(instance.InstanceId))
                {
                    commandText.Append(" AND InstanceId <> @InstanceId");
                }

                var serviceUrl = GetAbsoluteUri(instance.ServiceURL);

                using (var sqlConnection = new SqlConnection(ConnectionString))
                {
                    using (var sqlCommandIOrU = new SqlCommand(commandText.ToString(), sqlConnection))
                    {
                        await sqlConnection.OpenAsync();

                        sqlCommandIOrU.Parameters.AddWithValue("@InstanceName", instance.InstanceName);
                        sqlCommandIOrU.Parameters.AddWithValue("@ServiceURL", serviceUrl);
                        sqlCommandIOrU.Parameters.AddWithValue("@O365Domain", spHostWebDomain);

                        if (!String.IsNullOrWhiteSpace(instance.InstanceId))
                        {
                            sqlCommandIOrU.Parameters.AddWithValue("@InstanceId", instance.InstanceId);
                        }

                        var cmdResult = await sqlCommandIOrU.ExecuteScalarAsync();

                        return Convert.ToInt32(cmdResult) > 0;
                    }
                }
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        private static string GetAbsoluteUri(string serviceUrl)
        {
            try
            {
                return new Uri(serviceUrl).AbsoluteUri;
            }
            catch
            {
                return serviceUrl;
            }
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

        public static AppInstance GetMatchingInstanceByUrl(string requestUrl)
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

        public static async Task<bool> DeleteAppInstance(string instanceId, string spHostWebDomain)
        {
            try
            {
                var instanceEntity = GetAppInstanceEntity(instanceId, spHostWebDomain);
                if (instanceEntity == null)
                {
                    return false;
                }

                var commandText = "DELETE FROM QFSCredentials WHERE O365Domain = @O365Domain and InstanceId = @InstanceId";

                var sqlCommand = new SqlCommand(commandText);
                sqlCommand.Parameters.AddWithValue("@O365Domain", SqlDbType.NVarChar).Value = instanceEntity.O365Domain;
                sqlCommand.Parameters.AddWithValue("@InstanceId", SqlDbType.NVarChar).Value = instanceEntity.InstanceId;

                await InsertOrUpdateData(sqlCommand);

                return true;
            }
            catch
            {
                return false;
            }
        }

        private static async Task InsertOrUpdateData(SqlCommand sqlCommand)
        {
            using (var sqlConnection = new SqlConnection(ConnectionString))
            {
                sqlCommand.CommandType = CommandType.Text;
                sqlCommand.Connection = sqlConnection;

                await sqlConnection.OpenAsync();

                var cmdResult = await sqlCommand.ExecuteNonQueryAsync();
            }
        }
    }
}