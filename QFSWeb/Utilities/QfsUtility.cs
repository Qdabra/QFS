using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Web;

namespace QFSWeb.Utilities
{
    public class QfsUtility
    {
        public static string AggregateInner(Exception e)
        {
            var messages = new List<string>();

            while (e != null)
            {
                messages.Add(e.Message);
                e = e.InnerException;
            }

            return string.Join(Environment.NewLine, messages);
        }

        public static Exception HandleException(Exception e)
        {
#if DEBUG
            return new ApplicationException(AggregateInner(e), e);
#else
            return e;
#endif
        }

        internal static string InternalGetQFSVersion()
        {
            Assembly assembly = Assembly.GetExecutingAssembly();
            string version = GetVersionNumber(assembly);

            AssemblyName assemblyName = assembly.GetName();
            string configName = GetConfigName(assembly);
            if (!string.IsNullOrEmpty(configName))
                return string.Format("{0} ({1})", version, configName);
            return version;
        }

        private static string GetVersionNumber(Assembly assembly)
        {
            Version assemblyVersion = assembly.GetName().Version;
            DateTime buildDateTime = RetrieveLinkerTimestamp(assembly);

            return string.Format("{0}.{1}.{2}.{3:00}{4:00}",
                                 assemblyVersion.Major,
                                 assemblyVersion.Minor,
                                 buildDateTime.Year,
                                 buildDateTime.Month,
                                 buildDateTime.Day);
        }

        private static string GetConfigName(Assembly assembly)
        {
            object[] attr = assembly.GetCustomAttributes(typeof(AssemblyConfigurationAttribute), false);
            if (attr.Length > 0)
            {
                AssemblyConfigurationAttribute aca = (AssemblyConfigurationAttribute)attr[0];
                return aca.Configuration;
            }
            return "";
        }

        private static DateTime RetrieveLinkerTimestamp(Assembly assembly)
        {
            string filePath = assembly.Location;
            const int c_PeHeaderOffset = 60;
            const int c_LinkerTimestampOffset = 8;
            byte[] b = new byte[2048];

            using (Stream s = new FileStream(filePath, System.IO.FileMode.Open, System.IO.FileAccess.Read))
            {
                s.Read(b, 0, 2048);
            }

            int i = System.BitConverter.ToInt32(b, c_PeHeaderOffset);
            int secondsSince1970 = System.BitConverter.ToInt32(b, i + c_LinkerTimestampOffset);
            DateTime dt = new DateTime(1970, 1, 1, 0, 0, 0);
            dt = dt.AddSeconds(secondsSince1970);
            return dt;
        }

        /// <summary>
        /// Method to format location
        /// </summary>
        /// <param name="location">SPHostUrl passed as location</param>
        /// <returns></returns>
        public static string FormatLocation(string location)
        {
            if (String.IsNullOrWhiteSpace(location))
            {
                return null;
            }

            location = location.Trim();

            if (location.EndsWith("/"))
            {
                location = location.Substring(0, location.Length - 1);
            }

            return location.ToLower();
        }
    }
}