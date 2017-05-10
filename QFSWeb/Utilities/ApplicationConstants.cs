using System;
using System.Configuration;

namespace QFSWeb
{
    public class ApplicationConstants
    {
        public static class AzureStorage
        {
            public const string StorageConnectionString = "AzureTableStorageConnectionString";
            public const string TableStorageKey = "QFSCredentials";
            public const string TableTemplates = "Templates";
            public const string TableTemplateInstances = "TemplateInstances";
            public const string StorageProvider = "AzureStorage";

        }

        public static class SQLStorage
        {
            public const string StorageConnectionString = "SQLTableStorageConnectionString";
            public const string StorageProviderKey = "StorageProvider";
            public const string StorageProvider = "SQLProvider";
            public const string TableTemplates = "Templates";

        }

        public static class RijndaelConst
        {
            public const string PassPhrase = "Pas5pr@se";        // can be any string
            public const string InitVector = "@1B2c3D4e5F6g7H8"; // must be 16 bytes
        }

        public static class LocationAllowanceConstant
        {
            public const int MaxMonthlyOpenCount = 500;

            public static bool EnableLicensing
            {
                get
                {
                    bool enableLicensing;

                    Boolean.TryParse(Convert.ToString(ConfigurationManager.AppSettings["EnableLicensing"]), out enableLicensing);

                    return enableLicensing;
                }
            }

            public static int DefaultMonthlyOpenCount
            {
                get
                {
                    int defaultMonthlyOpenCount;
                    if (!(int.TryParse(Convert.ToString(ConfigurationManager.AppSettings["DefaultMonthlyOpenCount"]), out defaultMonthlyOpenCount)))
                    {
                        defaultMonthlyOpenCount = MaxMonthlyOpenCount;
                    }

                    return defaultMonthlyOpenCount;
                }
            }
        }

        public static class ScanDiagnosticsConstant
        {
            public static string ScanDiagnosticsTemplateName
            {
                get
                {
                    return Convert.ToString(ConfigurationManager.AppSettings["ScanDiagnosticsTemplateName"]);
                }
            }

            public static string ScanDiagnosticsDbxlUrl
            {
                get
                {
                    return Convert.ToString(ConfigurationManager.AppSettings["ScanDiagnosticsDbxlUrl"]);
                }
            }

            public static string ScanDiagnosticsDbxlUserName
            {
                get
                {
                    return Convert.ToString(ConfigurationManager.AppSettings["ScanDiagnosticsDbxlUserName"]);
                }
            }

            public static string ScanDiagnosticsDbxlPassword
            {
                get
                {
                    return Convert.ToString(ConfigurationManager.AppSettings["ScanDiagnosticsDbxlPassword"]);
                }
            }
        }

        public static class DataConnectionConstant
        {
            public static bool EnableSqlDataConnection
            {
                get
                {
                    bool enableSqlDataConnection;

                    Boolean.TryParse(Convert.ToString(ConfigurationManager.AppSettings["EnableSqlDataConnection"]), out enableSqlDataConnection);

                    return enableSqlDataConnection;
                }
            }
        }
    }
}