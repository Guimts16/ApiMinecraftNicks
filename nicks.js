const axios = require('axios');
const generateRandomString = (length) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

const S = 3;
(async () => {
    while (S === 3) {
        const user = generateRandomString(S);
        const url = `https://api.mojang.com/users/profiles/minecraft/${user}`;

        try {
            const response = await axios.get(url);
            const data = response.data;

            if (data && data.name) {
                console.log(`Pensando... (${data.name}) | Status: ${response.status}`);
            }
        } catch (error) {
            if (error.response && error.response.data && error.response.data.errorMessage) {
                console.log(`\n\n\n\n\n\n\n\n\nENCONTRADO\n\nNick: ${user}\n\n\n\n\n\n\n\n\n`);
            }
        }
    }
})();
