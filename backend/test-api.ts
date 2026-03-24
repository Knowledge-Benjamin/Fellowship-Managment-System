import axios from 'axios';

// Get a token by logging in as Make Manifest Admin
async function main() {
    try {
        const loginRes = await axios.post('https://fms-backend-ezyu.onrender.com/api/auth/login', {
            fellowshipNumber: 'M2500000',
            password: 'password123'
        });
        
        const token = loginRes.data.token;
        console.log("Logged in successfully.");

        console.log("Fetching Bring 20 campaigns...");
        const mobRes = await axios.get('https://fms-backend-ezyu.onrender.com/api/campaigns', {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (mobRes.data.length > 0) {
            const campaignId = mobRes.data[0].id;
            console.log(`Fetching details for campaign ${campaignId}...`);
            const detailRes = await axios.get(`https://fms-backend-ezyu.onrender.com/api/campaigns/${campaignId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Contacts snippet:");
            console.log(JSON.stringify(detailRes.data.contacts.slice(0, 2), null, 2));
        }

        console.log("\nFetching Bring 1 events...");
        const eventsRes = await axios.get('https://fms-backend-ezyu.onrender.com/api/bring-one/event/32b0a996-cc08-4171-aa31-e18e001991ca', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Bring 1 pledges snippet:");
        console.log(JSON.stringify(eventsRes.data.pledges.slice(0, 2), null, 2));

    } catch (e: any) {
        console.error("Error:", e.response?.data || e.message);
    }
}

main();
