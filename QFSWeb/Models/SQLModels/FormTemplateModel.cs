using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Xml;

namespace QFSWeb.Models.SQLModels
{
    public class FormTemplateModel
    {
        public FormTemplateModel() { }

        public int ID { get; set; }

        public string UserKey { get; set; }

        public string TemplateName { get; set; }

        public string TemplateId { get; set; }

        public string CurrentInstanceId { get; set; }

        public string CurrentVersion { get; set; }

        public DateTime? Uploaded { get; set; }

        public string LastModifiedBy { get; set; }

        public string RowKeyTemplate { get; set; }

        private static string NormalizeSpace(string value)
        {
            return System.Text.RegularExpressions.Regex.Replace(value.Trim(), @"\s{2,}", " ");
        }

        public static string NormalizeName(string templateName)
        {
            return XmlConvert.EncodeLocalName(NormalizeSpace(templateName.ToLowerInvariant()));
        }
    }
}