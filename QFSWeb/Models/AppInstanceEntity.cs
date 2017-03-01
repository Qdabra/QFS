using Microsoft.WindowsAzure.Storage.Table;

namespace QFSWeb.Models
{
    public class AppInstanceEntity : TableEntity
    {
        public AppInstanceEntity(string instanceId, string office365Domain)
            : base(office365Domain, instanceId) { }

        public AppInstanceEntity() { }

        public string InstanceId { get; set; }

        public string InstanceName { get; set; }

        public string ServiceURL { get; set; }

        public string Username { get; set; }

        public string Password { get; set; }

        public string Domain { get; set; }

        public string O365Domain { get; set; }
    }
}