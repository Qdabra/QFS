using System;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Threading.Tasks;
using System.Web.Configuration;

namespace QFSWeb.Utilities
{
    internal class DbManager
    {
        //private const string QdabraUsageConnectionString = "QdabraUsageConnectionString";

        //private const string SQLStorageConnectionString = "SQLStorageConnectionString";

        private const string QFSConnectionString = "QFSConnectionString";

        public static bool EnableLimiting
        {
            get { return (ConnectionString != null); }
        }

        public static string ConnectionString
        {
            get
            {
                //var provider = WebConfigurationManager.AppSettings.Get(ApplicationConstants.SQLStorage.StorageProviderKey);

                //ConnectionStringSettings qdabraConnString;

                //if (!string.IsNullOrWhiteSpace(provider) && provider.Equals(ApplicationConstants.SQLStorage.StorageProvider))
                //{
                //    qdabraConnString = ConfigurationManager.ConnectionStrings[SQLStorageConnectionString];
                //}
                //else
                //{
                //    qdabraConnString = ConfigurationManager.ConnectionStrings[QdabraUsageConnectionString];
                //}

                var qfsConnString = ConfigurationManager.ConnectionStrings[QFSConnectionString];

                return qfsConnString == null ? null : qfsConnString.ConnectionString;
            }
        }

        private static async Task<bool> IsUserExists(string userId)
        {
            var isUserExists = false;

            try
            {
                using (var sqlConnection = new SqlConnection(ConnectionString))
                {
                    using (var sqlCommand = new SqlCommand("SELECT COUNT(*) FROM [User] WHERE UserId=@UserId", sqlConnection))
                    {
                        sqlCommand.Parameters.AddWithValue("@UserId", userId);

                        await sqlConnection.OpenAsync();
                        var cmdResult = await sqlCommand.ExecuteScalarAsync();

                        var userCount = Convert.ToInt32(cmdResult);

                        isUserExists = userCount > 0;
                    }
                }
            }
            catch { }

            return isUserExists;
        }

        public static async Task<bool> EnsureUserRecord(string userId)
        {
            var isUserExists = await IsUserExists(userId);

            if (isUserExists)
            {
                return true;
            }

            var isUserCreated = false;
            try
            {
                using (var sqlConnection = new SqlConnection(ConnectionString))
                {
                    using (var sqlCommand = new SqlCommand("INSERT INTO [User] VALUES(@UserId)", sqlConnection))
                    {
                        sqlCommand.Parameters.AddWithValue("@UserId", userId);

                        await sqlConnection.OpenAsync();
                        var cmdResult = await sqlCommand.ExecuteNonQueryAsync();

                        isUserCreated = cmdResult > 0;
                    }
                }
            }
            catch { }

            return isUserCreated;
        }

        private static async Task<int> GetUsageCount(string userId)
        {
            var usageCount = 0;

            try
            {
                var dtUsage = new DataTable();
                using (var sqlConnection = new SqlConnection(ConnectionString))
                {
                    using (var sqlCommand = new SqlCommand("SELECT * FROM [Usage] WHERE UserId=@UserId", sqlConnection))
                    {
                        sqlCommand.Parameters.AddWithValue("@UserId", userId);

                        await sqlConnection.OpenAsync();

                        using (var sqlAdapter = new SqlDataAdapter(sqlCommand))
                        {
                            sqlAdapter.Fill(dtUsage);
                        }
                    }
                }

                if (dtUsage.Rows.Count > 0)
                {
                    usageCount = Convert.ToInt32(dtUsage.Rows[0]["Opens"]);
                }
            }
            catch { }

            return usageCount;
        }

        public static async Task AddUsage(string userId)
        {
            var usageCount = await GetUsageCount(userId);

            usageCount += 1;
            try
            {
                using (var sqlConnection = new SqlConnection(ConnectionString))
                {
                    var commandTextText = usageCount > 1
                        ? "UPDATE [Usage] SET Opens = Opens + 1 WHERE UserId = @UserId"
                        : "INSERT INTO [Usage] VALUES(@UserId, 1)";

                    using (var sqlCommand = new SqlCommand(commandTextText, sqlConnection))
                    {
                        sqlCommand.Parameters.AddWithValue("@UserId", userId);

                        await sqlConnection.OpenAsync();
                        var cmdResult = await sqlCommand.ExecuteNonQueryAsync();
                    }
                }
            }
            catch { }
        }
    }
}
