using QFSWeb.Models;
using System;
using System.Data;
using System.Data.SqlClient;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using System.Xml;

namespace QFSWeb.Utilities
{
    public class IPAdoAdapter
    {
        public static async Task<AdoDataResult> ExecuteAdoAdapterAsync(string connectionString, string commandText)
        {
            try
            {
                var connStringSplit = connectionString.Split(new string[] { ";" }, StringSplitOptions.RemoveEmptyEntries);
                var providerSplit = connStringSplit.Where(x => x.StartsWith("Provider", StringComparison.InvariantCultureIgnoreCase));

                if (providerSplit.Any())
                {
                    var providerNameSplit = providerSplit.First().Split(new string[] { "=" }, StringSplitOptions.RemoveEmptyEntries);
                    if (providerNameSplit.Length > 1)
                    {
                        if (providerNameSplit[1] != "SQLOLEDB.1")
                        {
                            return GetAdoDataResult(error: "Cannot query unsupported provider type");
                        }
                    }
                }

                var connStringParams = new string[] { "Password", "Persist Security Info", "User ID", "Initial Catalog", "Data Source", "Integrated Security" };
                var connString = String.Join("; ", connStringSplit.Where(x =>
                    connStringParams.Any(p => x.StartsWith(p, StringComparison.InvariantCultureIgnoreCase))));

                return (await GetExecuteResult(commandText, connString));
            }
            catch (Exception ex)
            {
                return GetAdoDataResult(error: ex.Message);
            }
        }

        #region Private Methods

        private static async Task<AdoDataResult> GetExecuteResult(string commandText, string connString)
        {
            DataTable schemaTable = null;
            var dt = new DataTable();

            using (var conn = new SqlConnection(connString))
            {
                using (var sqlComand = new SqlCommand(commandText, conn))
                {
                    await conn.OpenAsync();

                    using (var reader = await sqlComand.ExecuteReaderAsync(CommandBehavior.KeyInfo))
                    {
                        schemaTable = reader.GetSchemaTable();
                        dt.Load(reader);
                    }
                }
            }

            var tableName = GetTableName(dt, schemaTable);

            if (String.IsNullOrWhiteSpace(tableName))
            {
                return GetAdoDataResult(error: "Cannot parse table name from command");
            }

            tableName = FormatTableOrColumnName(tableName);

            var columns = dt.Columns.OfType<DataColumn>().Select(c => c.ColumnName);
            var results = dt.Rows.OfType<DataRow>()
                .Select(row => columns.Select(col => new
                {
                    Key = FormatTableOrColumnName(col),
                    Value = GetFormattedString(row[col])
                }).ToDictionary(r => r.Key, r => r.Value))
                .ToList();

            return GetAdoDataResult(data: results, success: true, nodeName: tableName);
        }

        private static string GetTableName(DataTable dt, DataTable schemaTable)
        {
            if (!String.IsNullOrWhiteSpace(dt.TableName))
            {
                return dt.TableName;
            }

            foreach (DataRow dr in schemaTable.Rows)
            {
                var tableName = dr["BaseTableName"];
                if (tableName != DBNull.Value)
                {
                    return Convert.ToString(tableName);
                }
            }
            return null;
        }

        private static string FormatTableOrColumnName(string column)
        {
            var columnArray = column.ToArray().Select(col => XmlConvert.IsNCNameChar(col) ? col : '_');

            var formattedColumn = String.Join(string.Empty, columnArray);

            if (!IsValidNCName(formattedColumn))
            {
                formattedColumn = "_" + formattedColumn;
            }

            Debug.Assert(IsValidNCName(formattedColumn));

            return formattedColumn;
        }

        private static bool IsValidNCName(string columnName)
        {
            try
            {
                XmlConvert.VerifyNCName(columnName);
                return true;
            }
            catch
            {
                return false;
            }
        }

        private static object GetFormattedString(object value)
        {
            var byteArray = value as byte[];
            if (byteArray != null)
            {
                return BitConverter.ToString(byteArray)
                    .Replace("-", string.Empty)
                    .ToLowerInvariant();
            }

            var valueString = Convert.ToString(value);
            if (String.IsNullOrWhiteSpace(valueString))
            {
                return string.Empty;
            }

            return value;
        }

        private static AdoDataResult GetAdoDataResult(object data = null, string error = null, bool success = false, string nodeName = null)
        {
            return new AdoDataResult
            {
                Data = data,
                Error = error,
                NodeName = nodeName,
                Success = success
            };
        }

        #endregion
    }
}