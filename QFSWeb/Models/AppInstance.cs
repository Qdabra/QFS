using Newtonsoft.Json;
using QFSWeb.Models.SQLModels;
using System.ComponentModel.DataAnnotations;

namespace QFSWeb.Models
{
    public class AppInstance
    {
        public AppInstance()
        {

        }

        public AppInstance(AppInstanceEntity entity)
        {
            InstanceId = entity.RowKey;
            InstanceName = entity.InstanceName;
            ServiceURL = entity.ServiceURL;
            Domain = entity.Domain;
            O365Domain = entity.PartitionKey;
            EncryptedUsername = entity.Username;
            EncryptedPassword = entity.Password;
        }

        public AppInstance(AppInstanceModel entity)
        {
            InstanceId = entity.InstanceId;
            InstanceName = entity.InstanceName;
            ServiceURL = entity.ServiceURL;
            Domain = entity.Domain;
            O365Domain = entity.O365Domain;
            EncryptedUsername = entity.Username;
            EncryptedPassword = entity.Password;
        }

        public string InstanceId { get; set; }

        [Required]
        [Display(Name = "Instance Name")]
        public string InstanceName { get; set; }

        [Required]
        [Display(Name = "Service Url")]
        public string ServiceURL { get; set; }

        [Required]
        public string Username { get; set; }

        [Required]
        public string Password { get; set; }

        [Required]
        public string Domain { get; set; }

        [JsonIgnore]
        public string EncryptedUsername { get; set; }

        [JsonIgnore]
        public string EncryptedPassword { get; set; }

        public string O365Domain { get; set; }

        public void InitializeCredentials()
        {
            if (!string.IsNullOrWhiteSpace(EncryptedUsername))
            {
                Username = CredentialManager.DecryptData(EncryptedUsername);
            }
            if (!string.IsNullOrWhiteSpace(EncryptedPassword))
            {
                Password = CredentialManager.DecryptData(EncryptedPassword);
            }
        }
    }
}