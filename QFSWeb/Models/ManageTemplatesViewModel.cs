using System.Collections.Generic;

namespace QFSWeb.Models
{
    public class ManageTemplatesViewModel
    {
        /// <summary>
        /// Templates list.
        /// </summary>
        public IEnumerable<FormTemplateViewModel> Templates { get; set; }

        /// <summary>
        /// Monthly form open count for current location.
        /// </summary>
        public int MonthlyFormOpenCount { get; set; }

        /// <summary>
        /// Current location.
        /// </summary>
        public string Location { get; set; }

        /// <summary>
        /// Is usage exceeded for current location.
        /// </summary>
        public bool IsUsageExceeded { get; set; }
    }
}