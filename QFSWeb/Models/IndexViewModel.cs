using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace QFSWeb.Models
{
    public class IndexViewModel
    {
        /// <summary>
        /// Is logged in user an Admin.
        /// </summary>
        public bool IsAdmin { get; set; }

        /// <summary>
        /// Current app version.
        /// </summary>
        public string Version { get; set; }

        /// <summary>
        /// Is usage exceeded for current location.
        /// </summary>
        public bool IsUsageExceeded { get; set; }
    }
}