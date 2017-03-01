using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace QFSWeb.Models
{
    public class SiteChartModel
    {
        public int Month { get; set; }

        public int Year { get; set; }

        public int Opens { get; set; }

        public string Location { get; set; }

        public DateTime Date
        {
            get
            {
                return new DateTime(Year, Month, 1);
            }
        }

        public string Title
        {
            get
            {
                return String.Format("{0} ({1}, {2})", Location, Date.ToString("MMMM"), Date.Year);
            }
        }
    }
}