using System;
using System.ComponentModel.DataAnnotations;
using System.Data.SqlClient;

namespace QFSWeb.Models
{
    public class LocationAllowance
    {
        public string Location { get; set; }

        [Display(Name = "Monthly Opens")]
        public int MonthlyOpens { get; set; }

        public DateTime? Expiration { get; set; }

        public LocationAllowance()
        {

        }

        public LocationAllowance(SqlDataReader reader)
        {
            if (reader == null || !reader.HasRows)
            {
                return;
            }

            Location = Convert.ToString(reader["Location"]);
            MonthlyOpens = Convert.ToInt32(reader["MonthlyOpens"]);
            Expiration = Convert.ToDateTime(reader["Expiration"]);
        }
    }
}