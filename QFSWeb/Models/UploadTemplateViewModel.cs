using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace QFSWeb.Models
{
    public class UploadTemplateViewModel
    {
        public bool CreateNew { get; set; }
        public string FormName { get; set; }
        public string Message { get; set; }
        public bool HideContent { get; set; }
        public bool IsUploaded { get; set; }
        public string OldVersion { get; set; }
        public string NewVersion { get; set; }
#if DEBUG
        public string Stack { get; set; }
#endif
    }
}