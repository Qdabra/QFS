using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace QFSWeb.Models.SQLModels
{
    public class FormTemplateInstanceModel
    {
        public FormTemplateInstanceModel() { }

        public int ID { get; set; }

        public string TemplateId { get; set; }

        public DateTime Uploaded { get; set; }

        public string Version { get; set; }

        public string InstanceId { get; set; }

        public string ManifestFileName { get; set; }

        public string TemplateFileName { get; set; }

        public string XsnOrginalFileName { get; set; }
    }
}