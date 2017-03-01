using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Xml;
using Microsoft.WindowsAzure.Storage.Table;

namespace QFSWeb.Models
{
    public class FormTemplateEntity : TableEntity
    {
        public FormTemplateEntity(string userKey, string templateName) :
            base(userKey, NormalizeName(templateName))
        {
            TemplateName = templateName;
        }

        public FormTemplateEntity() { }

        public string TemplateName { get; set; }

        public string TemplateId { get; set; }

        public string CurrentVersion { get; set; }

        public string CurrentInstanceId { get; set; }

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