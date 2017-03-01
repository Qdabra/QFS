using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace QFSWeb.Models
{
    public class FormTemplate
    {
        public string FormName
        {
            get; set;
        }

        public HttpPostedFileBase Template { get; set; }
    }
}