using System.Collections.Generic;
using System.Web.Mvc;
using System.Linq;
using System;

namespace QFSWeb.Models
{
    public class ManageUsageModel
    {
        public BaseDropDownModel Customers { get; set; }

        public BaseDropDownModel SiteCustomers { get; set; }

        public BaseDropDownModel FormCustomers { get; set; }
    }
}