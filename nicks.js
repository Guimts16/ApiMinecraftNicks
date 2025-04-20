const axios = require('axios');
const readline = require('readline');
const cliProgress = require('cli-progress');
const { parse } = require('path');

const generateRandomString = (length, existingNicks) => {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    do {
        result = '';
        for (let i = 0; i < length; i++) {
            let randomChar;

            do {
                randomChar = characters.charAt(Math.floor(Math.random() * characters.length));
            } while (result[i - 1] === randomChar);

            result += randomChar;
        }
    } while (existingNicks.has(result));

    return result;
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ask = (question) => new Promise(resolve => rl.question(question, resolve));

const checkMojang = async (username) => {
    try {
        await axios.get(`https://api.mojang.com/users/profiles/minecraft/${username}`);
        return true;
    } catch (err) {
        if (err.response && (err.response.status === 204 || err.response.status === 404)) {
            return false;
        }
        return null;
    }
};

const checkPlayerDB = async (username) => {
    try {
        const response = await axios.get(`https://api.playerdb.co/api/player/minecraft/${username}`);
        if (response.data && response.data.data && response.data.data.error === "Player not found") {
            return true;
        }
        return false;
    } catch (err) {
        return false;
    }
};

const runBatch = async (batchSize, length, existingNicks) => {
    const tasks = [];

    for (let i = 0; i < batchSize; i++) {
        const username = generateRandomString(length, existingNicks);
        tasks.push(
            (async () => {
                const mojang = await checkMojang(username);
                if (mojang === false) {
                    return username;
                }
                return null;
            })()
        );
    }

    const results = await Promise.all(tasks);
    return results.filter(r => r !== null);
};

const startSearch = async (length, limit, batchSize = 10) => {
    const encontrados = new Set();
    const tentativas = { count: 0 };

    const bar = new cliProgress.SingleBar({
        format: 'Progresso |{bar}| {percentage}% | Encontrados: {found}/{total} | Tentativas: {tries}',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    }, cliProgress.Presets.shades_classic);

    bar.start(100, 0, {
        found: 0,
        total: limit,
        tries: 0
    });

    while (encontrados.size < limit) {
        const disponiveis = await runBatch(batchSize, length, encontrados);
        disponiveis.forEach(nick => encontrados.add(nick));
        bar.update((encontrados.size / limit) * 100, {
            found: encontrados.size,
            tries: tentativas.count
        });
    }

    bar.stop();
    console.log('\n✅ Nicks encontrados na Mojang:\n');
    Array.from(encontrados).forEach((name, i) => {
        console.log(`${i + 1}. ${name}`);
    });

    const nicksErrados = [];
    const nicksDisponiveis = [];

    for (const nick of Array.from(encontrados)) {
        const isAvailable = await checkPlayerDB(nick);
        if (isAvailable) {
            nicksDisponiveis.push(nick);
        } else {
            nicksErrados.push(nick);
        }
    }

    console.log('\n✅ Nicks disponíveis após verificação na PlayerDB:');
    nicksErrados.forEach((nick, index) => {
        console.log(`${index + 1}. ${nick}`);
    });

    rl.close();
};

// Função para exibir o banner bonito e o menu interativo
const showBanner = () => {
    const banner = `
------------------------------------------------------
 🎉 Bem-vindo ao painel de verificação de nicks! 🎉
 ✨ MTS - Buscando os melhores nomes para você! ✨
------------------------------------------------------

███╗   ███╗████████╗███████╗
████╗ ████║╚══██╔══╝██╔════╝
██╔████╔██║   ██║   █████╗  
██║╚██╔╝██║   ██║       ███  
██║ ╚═╝ ██║   ██║   ███████╗
╚═╝     ╚═╝   ╚═╝   ╚══════╝
------------------------------------------------------

[1] Verificar nick
[0] Procurar nick disponível
`;

    console.log(banner);
};

(async () => {
    showBanner();

    const panel = parseInt(await ask(''));

    if (panel === 1) {
        const nick = await ask('Digite o nick que deseja verificar: ');
        const mojang = await checkMojang(nick);
        if (mojang) {
            console.log(`❌ O nick ${nick} já está em uso na Mojang.`);
        } else {
            console.log(`✅ O nick ${nick} está disponível na Mojang.`);
        }
        rl.close();
        return;
    }
    else if (panel === 0) {
        const size = parseInt(await ask('Quantos caracteres deve ter o nick? '));
        const limit = parseInt(await ask('Quantos nomes disponíveis deseja encontrar? '));
        const velocity = parseInt(await ask('Quantos nomes por segundo? (OBS: Quanto mais rápido, mais chance de "equívoco") '));
        startSearch(size, limit, velocity);
    }
    else {
        console.log('🚨 Opção inválida. Tente novamente.');
        rl.close();
    }
})();
