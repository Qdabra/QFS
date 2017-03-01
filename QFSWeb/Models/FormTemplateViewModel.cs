using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Linq;
using System.Web;

namespace QFSWeb.Models
{
    public class FormTemplateViewModel
    {
        public string UserKey { get; set; }

        public string TemplateName { get; set; }

        public string TemplateId { get; set; }

        public string CurrentInstanceId { get; set; }

        public string CurrentVersion { get; set; }

        public DateTime? Uploaded { get; set; }

        public string LastModifiedBy { get; set; }

        public int TotalOpens { get; set; }

        public int MonthlyOpens { get; set; }

        public FormTemplateViewModel()
        {

        }

        public FormTemplateViewModel(SqlDataReader reader)
        {
            CurrentInstanceId = Convert.ToString(reader["CurrentInstanceId"]);
            CurrentVersion = Convert.ToString(reader["CurrentVersion"]);
            TemplateId = Convert.ToString(reader["TemplateId"]);
            TemplateName = Convert.ToString(reader["TemplateName"]);
            UserKey = Convert.ToString(reader["UserKey"]);
            Uploaded = (reader["Uploaded"] == System.DBNull.Value) ? (DateTime?)null : Convert.ToDateTime(reader["Uploaded"]);
            LastModifiedBy = (reader["LastModifiedBy"] == System.DBNull.Value) ? "" : Convert.ToString(reader["LastModifiedBy"]);
            TotalOpens = Convert.ToInt32(reader["TotalOpens"]);
            MonthlyOpens = Convert.ToInt32(reader["MonthlyOpens"]);
        }
    }
}