using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace QFSWeb.Models.ViewModels
{
    public class ManageHrefsModel
    {
        public IEnumerable<HrefAssociation> Hrefs { get; set; }

        public IEnumerable<FormTemplateViewModel> Templates { get; set; }
    }
}