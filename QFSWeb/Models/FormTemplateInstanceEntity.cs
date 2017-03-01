using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Microsoft.WindowsAzure.Storage.Table;

namespace QFSWeb.Models
{
    public class FormTemplateInstanceEntity : TableEntity
    {
        public FormTemplateInstanceEntity(string templateId, string instanceId)
            : base(templateId, instanceId)
        {
            InstanceId = instanceId;
        }

        public FormTemplateInstanceEntity() { }

        public DateTime Uploaded { get; set; }

        public string Version { get; set; }

        public string InstanceId { get; set; }

        public string ManifestFileName { get; set; }

        public string TemplateFileName { get; set; }

        public string XsnOrginalFileName { get; set; }
    }
}