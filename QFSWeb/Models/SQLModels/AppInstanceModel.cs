using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace QFSWeb.Models.SQLModels
{
    public class AppInstanceModel
    {
        public string InstanceId { get; set; }

        public string InstanceName { get; set; }

        public string ServiceURL { get; set; }

        public string Username { get; set; }

        public string Password { get; set; }

        public string Domain { get; set; }

        public string O365Domain { get; set; }
    }
}