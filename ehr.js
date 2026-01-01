const axios = require("axios");

async function fetchAndFormatPatientData() {
  try {
    const response = await axios.get("https://dummyjson.com/users/4");
    const data = response.data;

    // Map API data to your requisition form structure
    const reqObj = {
      patient: {
        firstname: data.firstName || "Michael",
        middlename: data.middleName || "Andrew",
        lastname: data.lastName || "Thompson",
        gender: data.gender || "male",
        dob: data.birthDate || "1987-09-14",
        email: data.email || "michael.thompson87@gmail.com",
        phone: data.phone || "617-555-8392",
      },
      insurance: {
        provider: "Blue Cross Blue Shield",
        id: "BCBS-MA-784392615",
      },
      provider: {
        name: "Dr. Sarah L. Martinez, MD",
        npi: "1467583920",
        address: "1250 Medical Plaza Dr, Suite 420, Boston, MA 02115",
      },
    };

    console.log(reqObj);
    return reqObj;
  } catch (error) {
    console.error("Error fetching user data:", error.message);
    return null;
  }
}

module.exports = {
  fetchAndFormatPatientData,
};
