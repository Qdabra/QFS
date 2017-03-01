using QFSWeb.Interface;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Net.Mime;
using System.Threading.Tasks;
using System.Web;
using System.Web.Configuration;

namespace QFSWeb.Utilities
{
    public class SQLStorageHelper : IStorageHelper
    {
        private const string QFSConnectionString = "QFSConnectionString";

        public static bool EnableLimiting
        {
            get { return (ConnectionString != null); }
        }

        public static string ConnectionString
        {
            get
            {
                var qfsConnString = ConfigurationManager.ConnectionStrings[QFSConnectionString];

                return qfsConnString == null ? null : qfsConnString.ConnectionString;
            }
        }

        internal static string GetContentType(string fileName)
        {
            return InfoPathServices.Utilities.GetContentType(fileName, MediaTypeNames.Text.Plain);
        }

        public async Task<BlobFileInfo> UploadFile(string containerName, Stream inputStream, string fileName = null)
        {
            fileName = Path.GetFileName(fileName);

            BinaryReader br = new BinaryReader(inputStream);
            Byte[] bytes = br.ReadBytes((Int32)inputStream.Length);

            //insert the file into database            
            string strQuery = "insert into TemplateFiles(Name, Size, LastModifiedUTC, ContentType, FileGroupId, TemplateFile) values (@Name, @Size, @LastModifiedUTC, @ContentType, @FileGroupId, @TemplateFile)";

            var sqlCommand = new SqlCommand(strQuery);
            sqlCommand.Parameters.Add("@Name", SqlDbType.NVarChar).Value = fileName;
            sqlCommand.Parameters.Add("@Size", SqlDbType.NVarChar).Value = inputStream.Length;
            sqlCommand.Parameters.Add("@LastModifiedUTC", SqlDbType.DateTime).Value = DateTime.UtcNow;
            sqlCommand.Parameters.Add("@ContentType", SqlDbType.NVarChar).Value = GetContentType(fileName);
            sqlCommand.Parameters.Add("@FileGroupId", SqlDbType.NVarChar).Value = containerName;
            sqlCommand.Parameters.Add("@TemplateFile", SqlDbType.VarBinary).Value = bytes;

            await InsertUpdateData(sqlCommand);

            return new BlobFileInfo
            {
                BlobName = fileName,
                Container = containerName,
                FileName = fileName
            };
        }

        public async Task<BlobFileInfo> GetFileAsync(string containerName, string fileName)
        {
            MemoryStream stream = new MemoryStream();
            string contentType = string.Empty;

            try
            {
                using (var sqlConnection = new SqlConnection(ConnectionString))
                {
                    using (var sqlCommand = new SqlCommand("SELECT * FROM TemplateFiles WHERE FileGroupId = @FileGroupId and Name = @Name", sqlConnection))
                    {
                        sqlCommand.Parameters.AddRange(new[]
                        {
                            new SqlParameter("@FileGroupId", SqlDbType.NVarChar, 255) { Value = containerName },
                            new SqlParameter("@Name", SqlDbType.NVarChar, 255) { Value = fileName },
                        });

                        await sqlConnection.OpenAsync();

                        using (SqlDataReader reader = await sqlCommand.ExecuteReaderAsync())
                        {
                            if (!reader.Read())
                                return null;

                            stream = new MemoryStream((byte[])reader["TemplateFile"]);
                            contentType = Convert.ToString(reader["ContentType"]);
                        }
                    }
                }
            }
            catch { }

            stream.Position = 0;

            return new BlobFileInfo
            {
                FileStream = stream,
                ContentType = contentType
            };
        }

        internal static async Task<bool> DeleteFileAsync(string containerName, string blobName)
        {
            var commandText = "DELETE FROM TemplateFiles WHERE FileGroupId = @FileGroupId and Name = @Name";

            var sqlCommand = new SqlCommand(commandText);
            sqlCommand.Parameters.AddWithValue("@FileGroupId", SqlDbType.NVarChar).Value = containerName;
            sqlCommand.Parameters.AddWithValue("@Name", SqlDbType.NVarChar).Value = blobName;

            return await InsertUpdateData(sqlCommand);
        }

        public async Task DeleteContainer(string containerName)
        {
            var commandText = "DELETE FROM TemplateFiles WHERE FileGroupId = @FileGroupId";

            var sqlCommand = new SqlCommand(commandText);
            sqlCommand.Parameters.AddWithValue("@FileGroupId", SqlDbType.NVarChar).Value = containerName;

            await InsertUpdateData(sqlCommand);
        }

        private static async Task<bool> InsertUpdateData(SqlCommand sqlCommand)
        {
            try
            {
                using (var sqlConnection = new SqlConnection(ConnectionString))
                {
                    sqlCommand.CommandType = CommandType.Text;
                    sqlCommand.Connection = sqlConnection;

                    await sqlConnection.OpenAsync();

                    var cmdResult = await sqlCommand.ExecuteNonQueryAsync();

                    return true;
                }
            }
            catch { return false; }
        }

    }
}