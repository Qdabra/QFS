using System.Collections.Generic;

namespace QFSWeb.Models
{
    public class LocationsResultModel
    {
        public bool IsExpired { get; set; }
        public IEnumerable<string> Locations { get; set; }
    }
}