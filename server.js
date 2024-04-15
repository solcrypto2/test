const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(bodyParser.json());

// CORS politikalarını ayarla
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

// MongoDB bağlantı URL'si
const uri = "mongodb+srv://dogukanbkara:123necc123@cluster0.mb7krzd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);


//REGISTER 

// Bu endpoint, GET istekleri için işlem yapar
app.get('/register', async (req, res) => {
    try {
        // İstekten gelen wallet parametresini al
        const wallet = req.query.wallet;

        // MongoDB bağlantısını aç
        await client.connect();
        const database = client.db("mydatabase");
        const collection = database.collection("player");
        
        // Öncelikle, veritabanında bu kullanıcıyı kontrol edelim
        const existingPlayer = await collection.findOne({ wallet: wallet });
        
        if (existingPlayer) {
            // Kullanıcı zaten varsa, "exists" yanıtını döndür
            res.status(200).send("exists");
        } else {
            // Kullanıcı yoksa, "not_exists" yanıtını döndür
            res.status(200).send("not_exists");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("İç sunucu hatası");
    } finally {
        // Bağlantıyı kapat
        await client.close();
    }
});

// Bu endpoint, POST istekleri için işlem yapar
app.post('/register', async (req, res) => {
    try {
        const playerData = req.body;

        // MongoDB bağlantısını aç
        await client.connect();
        const database = client.db("mydatabase");
        const collection = database.collection("player");

        // Yeni kullanıcıyı veritabanına ekle
        await collection.insertOne(playerData);

        // Başarılı yanıtı gönder
        res.status(201).send("Player registered successfully");
    } catch (error) {
        console.error(error);
        res.status(500).send("İç sunucu hatası");
    } finally {
        // Bağlantıyı kapat
        await client.close();
    }
});

// Bu endpoint, GET istekleri için işlem yapar
app.get('/getPlayerData', async (req, res) => {
    try {
        // İstekten gelen cüzdan adresini al
        const wallet = req.query.wallet;

        // MongoDB bağlantısını aç
        await client.connect();
        const database = client.db("mydatabase");
        const collection = database.collection("player");

        // Veritabanından oyuncu verilerini çek
        const playerData = await collection.findOne({ wallet: wallet });

        if (playerData) {
            // Oyuncu verileri bulunduysa, JSON formatında yanıtı gönder
            res.status(200).json(playerData);
        } else {
            // Oyuncu verileri bulunamadıysa, uygun bir yanıt gönder
            res.status(404).send("Player data not found");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("İç sunucu hatası");
    } finally {
        // Bağlantıyı kapat
        await client.close();
    }
});

////BALANCE

// Bu endpoint, oyuncunun bakiyesini düşürmek için kullanılır
app.post('/spendBalance', async (req, res) => {
    try {
        const { wallet, amount } = req.body; // İstekten cüzdan adresi ve düşürülecek miktarı al

        // MongoDB bağlantısını aç
        await client.connect();
        const database = client.db("mydatabase");
        const collection = database.collection("player");

        // Oyuncunun mevcut bakiyesini al
        const playerData = await collection.findOne({ wallet: wallet });

        if (playerData) {
            // Oyuncunun bakiyesi istenilen miktardan fazla mı kontrol et
            if (playerData.balance >= amount) {
                // Bakiyeyi düşür ve güncelle
                await collection.updateOne({ wallet: wallet }, { $inc: { balance: -amount } });

                res.status(200).send("Balance spent successfully");
            } else {
                res.status(400).send("Insufficient balance");
            }
        } else {
            res.status(404).send("Player data not found");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal server error");
    } finally {
        // Bağlantıyı kapat
        await client.close();
    }
});

app.post('/updateBalance', async (req, res) => {
    try {
        const { wallet, balance } = req.body; // İstekten cüzdan adresi ve yeni bakiyeyi al

        // MongoDB bağlantısını aç
        await client.connect();
        const database = client.db("mydatabase");
        const collection = database.collection("player");

        // Oyuncunun bakiyesini güncelle
        await collection.updateOne({ wallet: wallet }, { $set: { balance: balance } });

        res.status(200).send("Balance updated successfully");
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal server error");
    } finally {
        // Bağlantıyı kapat
        await client.close();
    }
});



/////SHOES

// Bu endpoint, ayakkabıların satın alındığını güncellemek için kullanılır
// Bu endpoint, ayakkabıların satın alındığını güncellemek için kullanılır
const shoesDuration = 3; // Ayakkabı süresi, örneğin 14 dakika

app.post('/updateShoesPurchase', async (req, res) => {
    try {
        const { wallet, hasPurchased, isTimerRunning } = req.body;

        await client.connect();
        const database = client.db("mydatabase");
        const collection = database.collection("player");

        // İlgili oyuncunun ayakkabı satın alındı bayrağını ve zamanlayıcı durumunu güncelle
        await collection.updateOne({ wallet: wallet }, { $set: { hasboughtShoes: hasPurchased, isShoesTimerRunning: isTimerRunning } });

        // Ayakkabılar satın alındıysa ve zamanlayıcı çalışıyorsa
        if (hasPurchased && isTimerRunning) {
            // Satın alma anını al
            const purchaseTime = Date.now();

            // Veritabanındaki ayakkabı satın alma zamanını ve zamanlayıcı başlangıç zamanını güncelle
            await collection.updateOne({ wallet: wallet }, { $set: { shoesPurchaseTime: purchaseTime, shoesTimerStartTime: purchaseTime } });

            // Satın alma anından bu yana geçen süreyi hesapla ve dakikaya dönüştür
            const currentTime = Date.now();
            const elapsedTimeInMinutes = Math.floor((currentTime - purchaseTime) / 60000);

            // Ayakkabıların alındığı andan bu yana geçen süreyi ayarla
            await collection.updateOne({ wallet: wallet }, { $set: { shoesTimer: elapsedTimeInMinutes } });

            // Eğer shoesTimer, shoesDuration'a eşitse, ilgili alanları sıfırla
            if (elapsedTimeInMinutes >= shoesDuration) {
                await collection.updateOne({ wallet: wallet }, { $unset: { shoesPurchaseTime: "", shoesTimerStartTime: "" }, $set: { shoesTimer: 0, hasboughtShoes: false, isShoesTimerRunning: false } });
            }
        } else {
            // Zamanlayıcı çalışmıyorsa veya ayakkabı satın alınmamışsa, ilgili alanları sıfırla
            await collection.updateOne({ wallet: wallet }, { $unset: { shoesPurchaseTime: "", shoesTimerStartTime: "" }, $set: { shoesTimer: 0, hasboughtShoes: false, isShoesTimerRunning: false } });
        }

        res.status(200).send("Shoes purchase updated successfully");
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal server error");
    } finally {
        await client.close();
    }
});

const shoesDurationInMinutes = 3; // Ayakkabı süresi dakika cinsinden
const intervalInMilliseconds = 10000; // Her 10 saniyede bir kontrol edilecek

// Otomatik olarak ayakkabı zamanlayıcılarını güncellemek için setInterval kullanımı
setInterval(updateShoesTimersForAllPlayers, intervalInMilliseconds);

async function updateShoesTimersForAllPlayers() {
    try {
        const client = new MongoClient(uri);
        await client.connect();
        const database = client.db("mydatabase");
        const collection = database.collection("player");

        // Tüm oyuncuları al
        const players = await collection.find({}).toArray();

        // Her bir oyuncu için işlem yap
        for (const player of players) {
            // Oyuncunun ayakkabı satın alındığı zamanı ve geçen süreyi kontrol et
            if (player.hasboughtShoes && player.isShoesTimerRunning) {
                // Zamanlayıcı çalışıyorsa
                const currentTime = Date.now();
                const elapsedTimeInMilliseconds = currentTime - player.shoesPurchaseTime;

                // Geçen süreyi dakika cinsine dönüştür
                const elapsedTimeInMinutes = Math.floor(elapsedTimeInMilliseconds / 60000);

                // Ayakkabıların alındığı andan bu yana geçen süreyi ayarla
                await collection.updateOne({ wallet: player.wallet }, { $set: { shoesTimer: elapsedTimeInMinutes } });

                // Eğer geçen süre, ayakkabı süresini aştıysa, shoesTimer'a 1 ekleyin
                if (elapsedTimeInMinutes >= shoesDurationInMinutes) {
                    // shoesTimer'a 1 ekleyin
                    const currentShoesTimerValue = player.shoesTimer || 0;
                    await collection.updateOne({ wallet: player.wallet }, { $set: { shoesTimer: currentShoesTimerValue + 1 } });

                    // İlgili alanları sıfırla
                    await collection.updateOne({ wallet: player.wallet }, { $unset: { shoesPurchaseTime: "", shoesTimerStartTime: "" }, $set: { hasboughtShoes: false, isShoesTimerRunning: false } });
                }
            } else {
                // Zamanlayıcı çalışmıyorsa veya ayakkabı satın alınmamışsa, ilgili alanları sıfırla
                await collection.updateOne({ wallet: player.wallet }, { $unset: { shoesPurchaseTime: "", shoesTimerStartTime: "" }, $set: { shoesTimer: 0, hasboughtShoes: false, isShoesTimerRunning: false } });
            }
        }

        console.log("Shoes timers updated for all players");
    } catch (error) {
        console.error("Error updating shoes timers for all players:", error);
    } finally {
        // Bağlantıyı kapat
        await client.close();
    }
}




//// GOLDEN CLOCK

// Bu endpoint, altın saatlerin satın alındığını güncellemek için kullanılır
const goldenClockDuration = 5; // Altın Saat süresi, örneğin 5 dakika

app.post('/updateGoldenClockPurchase', async (req, res) => {
    try {
        const { wallet, hasPurchased, isTimerRunning } = req.body;

        await client.connect();
        const database = client.db("mydatabase");
        const collection = database.collection("player");

        // İlgili oyuncunun altın saat satın alındı bayrağını ve zamanlayıcı durumunu güncelle
        await collection.updateOne({ wallet: wallet }, { $set: { hasboughtGoldenClock: hasPurchased, isGoldenClockTimerRunning: isTimerRunning } });

        // Altın saatler satın alındıysa ve zamanlayıcı çalışıyorsa
        if (hasPurchased && isTimerRunning) {
            // Satın alma anını al
            const purchaseTime = Date.now();

            // Veritabanındaki altın saat satın alma zamanını ve zamanlayıcı başlangıç zamanını güncelle
            await collection.updateOne({ wallet: wallet }, { $set: { goldenClockPurchaseTime: purchaseTime, goldenClockTimerStartTime: purchaseTime } });

            // Satın alma anından bu yana geçen süreyi hesapla ve dakikaya dönüştür
            const currentTime = Date.now();
            const elapsedTimeInMinutes = Math.floor((currentTime - purchaseTime) / 60000);

            // Altın saatlerin alındığı andan bu yana geçen süreyi ayarla
            await collection.updateOne({ wallet: wallet }, { $set: { goldenClockTimer: elapsedTimeInMinutes } });

            // Eğer goldenClockTimer, goldenClockDuration'a eşitse, ilgili alanları sıfırla
            if (elapsedTimeInMinutes >= goldenClockDuration) {
                await collection.updateOne({ wallet: wallet }, { $unset: { goldenClockPurchaseTime: "", goldenClockTimerStartTime: "" }, $set: { goldenClockTimer: 0, hasboughtGoldenClock: false, isGoldenClockTimerRunning: false } });
            }
        } else {
            // Zamanlayıcı çalışmıyorsa veya altın saatler satın alınmamışsa, ilgili alanları sıfırla
            await collection.updateOne({ wallet: wallet }, { $unset: { goldenClockPurchaseTime: "", goldenClockTimerStartTime: "" }, $set: { goldenClockTimer: 0, hasboughtGoldenClock: false, isGoldenClockTimerRunning: false } });
        }

        res.status(200).send("Golden Clock purchase updated successfully");
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal server error");
    } finally {
        await client.close();
    }
});

const goldenClockDurationInMinutes = 5; // Altın Saat süresi dakika cinsinden

// Otomatik olarak altın saat zamanlayıcılarını güncellemek için setInterval kullanımı
setInterval(updateGoldenClockTimersForAllPlayers, intervalInMilliseconds);

async function updateGoldenClockTimersForAllPlayers() {
    try {
        const client = new MongoClient(uri);
        await client.connect();
        const database = client.db("mydatabase");
        const collection = database.collection("player");

        // Tüm oyuncuları al
        const players = await collection.find({}).toArray();

        // Her bir oyuncu için işlem yap
        for (const player of players) {
            // Oyuncunun altın saatlerin satın alındığı zamanı ve geçen süreyi kontrol et
            if (player.hasboughtGoldenClock && player.isGoldenClockTimerRunning) {
                // Zamanlayıcı çalışıyorsa
                const currentTime = Date.now();
                const elapsedTimeInMilliseconds = currentTime - player.goldenClockPurchaseTime;

                // Geçen süreyi dakika cinsine dönüştür
                const elapsedTimeInMinutes = Math.floor(elapsedTimeInMilliseconds / 60000);

                // Altın saatlerin alındığı andan bu yana geçen süreyi ayarla
                await collection.updateOne({ wallet: player.wallet }, { $set: { goldenClockTimer: elapsedTimeInMinutes } });

                // Eğer geçen süre, altın saat süresini aştıysa, goldenClockTimer'a 1 ekleyin
                if (elapsedTimeInMinutes >= goldenClockDurationInMinutes) {
                    // goldenClockTimer'a 1 ekleyin
                    const currentGoldenClockTimerValue = player.goldenClockTimer || 0;
                    await collection.updateOne({ wallet: player.wallet }, { $set: { goldenClockTimer: currentGoldenClockTimerValue + 1 } });

                    // İlgili alanları sıfırla
                    await collection.updateOne({ wallet: player.wallet }, { $unset: { goldenClockPurchaseTime: "", goldenClockTimerStartTime: "" }, $set: { hasboughtGoldenClock: false, isGoldenClockTimerRunning: false } });
                }
            } else {
                // Zamanlayıcı çalışmıyorsa veya altın saatler satın alınmamışsa, ilgili alanları sıfırla
                await collection.updateOne({ wallet: player.wallet }, { $unset: { goldenClockPurchaseTime: "", goldenClockTimerStartTime: "" }, $set: { goldenClockTimer: 0, hasboughtGoldenClock: false, isGoldenClockTimerRunning: false } });
            }
        }

        console.log("Golden Clock timers updated for all players");
    } catch (error) {
        console.error("Error updating Golden Clock timers for all players:", error);
    } finally {
        // Bağlantıyı kapat
        await client.close();
    }
}
////COWBOY HAT


app.post('/updateLegendCowboyHatPurchase', async (req, res) => {
    try {
        const { wallet, hasPurchased } = req.body; // İstekten cüzdan adresini ve hasPurchased değerini al

        // MongoDB bağlantısını aç
        await client.connect();
        const database = client.db("mydatabase");
        const collection = database.collection("player");

        // İlgili oyuncunun Legend Cowboy Hat satın alma durumunu güncelle
        await collection.updateOne({ wallet: wallet }, { $set: { hasboughtCowboyHat: hasPurchased } });

        // Başarılı yanıtı gönder
        res.status(200).send("Legend Cowboy Hat purchase updated successfully");
    } catch (error) {
        console.error(error);
        // İç sunucu hatası
        res.status(500).send("Internal server error");
    } finally {
        // Bağlantıyı kapat
        await client.close();
    }
});


/// GOLDEN SHOTGUN
app.post('/updateShotgunPurchase', async (req, res) => {
    try {
        const { wallet, hasPurchased } = req.body; // İstekten cüzdan adresini ve hasPurchased değerini al

        // MongoDB bağlantısını aç
        await client.connect();
        const database = client.db("mydatabase");
        const collection = database.collection("player");

        // İlgili oyuncunun Shotgun satın alma durumunu güncelle
        await collection.updateOne({ wallet: wallet }, { $set: { hasboughtShotgunPrice: hasPurchased } });

        // Başarılı yanıtı gönder
        res.status(200).send("Shotgun purchase updated successfully");
    } catch (error) {
        console.error(error);
        // İç sunucu hatası
        res.status(500).send("Internal server error");
    } finally {
        // Bağlantıyı kapat
        await client.close();
    }
});


// PLAYER LEVEL
app.post('/updatePlayerLevel', async (req, res) => {
    try {
        const { wallet, playerLevel } = req.body; // İstekten cüzdan adresini ve yeni seviyeyi al

        // MongoDB bağlantısını aç
        await client.connect();
        const database = client.db("mydatabase");
        const collection = database.collection("player");

        // Oyuncunun seviyesini güncelle
        await collection.updateOne({ wallet: wallet }, { $set: { playerLevel: playerLevel } });

        res.status(200).send("Player level updated successfully");
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal server error");
    } finally {
        // Bağlantıyı kapat
        await client.close();
    }
});


// Bu endpoint, şerifi kiralamak için kullanılır
// Bu endpoint, şerifi kiralamak için kullanılır
app.post('/rentSheriff', async (req, res) => {
    try {
        const { wallet, durationInMinutes } = req.body; // İstekten cüzdan adresini ve kiralama süresini al

        // Başlangıç süresini al
        const startTime = Date.now();

        // MongoDB bağlantısını aç
        await client.connect();
        const database = client.db("mydatabase");
        const collection = database.collection("player");

        // Oyuncunun verilerini güncelle
        await collection.updateOne({ wallet: wallet }, { $set: { isSheriffRented: true, isSheriffTimerRunning: true, SheriffTimer: durationInMinutes, SheriffRentalDuration: durationInMinutes, sheriffRentalStartTime: startTime } });

        res.status(200).send("Sheriff rented successfully");
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal server error");
    } finally {
        // Bağlantıyı kapat
        await client.close();
    }
});

// setInterval kullanarak SheriffTimer'ı her dakika arttır
setInterval(updateSheriffTimerForAllPlayers, 10000);

async function updateSheriffTimerForAllPlayers() {
    try {
        const client = new MongoClient(uri);
        await client.connect();
        const database = client.db("mydatabase");
        const collection = database.collection("player");

        // Tüm oyuncuları al
        const players = await collection.find({ isSheriffTimerRunning: true }).toArray();

        // Her bir oyuncu için işlem yap
        for (const player of players) {
            // Başlangıç süresini al
            const startTime = player.sheriffRentalStartTime;
            // Şu anki zamanı al
            const currentTime = Date.now();
            // Başlangıçtan geçen süreyi dakika cinsine dönüştür
            const elapsedTimeInMinutes = Math.floor((currentTime - startTime) / 60000);

            // SheriffRentalDuration'ı artır ve SheriffTimer'ı azalt
            const updatedSheriffTimer = player.SheriffTimer - 1;
            const updatedRentalDuration = player.SheriffRentalDuration;

            await collection.updateOne({ wallet: player.wallet }, { 
                $set: { 
                    SheriffRentalDuration: updatedRentalDuration,
                    SheriffTimer: updatedSheriffTimer >= 0 ? updatedSheriffTimer : 0
                } 
            });

            if (updatedSheriffTimer <= 0) {
                // Süre dolduğunda isSheriffTimerRunning ve isSheriffRented false olmalı
                await collection.updateOne(
                    { wallet: player.wallet }, 
                    { 
                        $set: { 
                            isSheriffTimerRunning: false, 
                            isSheriffRented: false, 
                            SheriffRentalDuration: 0, 
                            sheriffRentalStartTime: 0 
                        } 
                    }
                );
            }
        }

        console.log("Sheriff timers updated for all players");
    } catch (error) {
        console.error("Error updating Sheriff timers for all players:", error);
    } finally {
        // Bağlantıyı kapat
        await client.close();
    }
}





//Salon LEVEL
app.post('/updateSalonLevel', async (req, res) => {
    try {
        const { wallet, salonLevel } = req.body; // İstekten salon ID'sini ve yeni seviyeyi al

        // MongoDB bağlantısını aç
        await client.connect();
        const database = client.db("mydatabase");
        const collection = database.collection("player");

        // Salonun seviyesini güncelle
        await collection.updateOne({ wallet: wallet }, { $set: { salonLevel: salonLevel } });

        res.status(200).send("Salon level updated successfully");
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal server error");
    } finally {
        // Bağlantıyı kapat
        await client.close();
    }
});

//Hotel LEVEL
app.post('/updateHotelLevel', async (req, res) => {
    try {
        const { wallet, hotelLevel } = req.body; // İstekten cüzdanı ve yeni otel seviyesini al

        // MongoDB bağlantısını aç
        await client.connect();
        const database = client.db("mydatabase");
        const collection = database.collection("player");

        // Otel seviyesini güncelle
        await collection.updateOne({ wallet: wallet }, { $set: { hotelLevel: hotelLevel } });

        res.status(200).send("Hotel level updated successfully");
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal server error");
    } finally {
        // Bağlantıyı kapat
        await client.close();
    }
});

///BARBER LEVEL

app.post('/updateBarberLevel', async (req, res) => {
    try {
        const { wallet, barberLevel } = req.body; // İstekten cüzdanı ve yeni berber seviyesini al

        // MongoDB bağlantısını aç
        await client.connect();
        const database = client.db("mydatabase");
        const collection = database.collection("player");

        // Berber seviyesini güncelle
        await collection.updateOne({ wallet: wallet }, { $set: { barberLevel: barberLevel } });

        res.status(200).send("Barber level updated successfully");
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal server error");
    } finally {
        // Bağlantıyı kapat
        await client.close();
    }
});


app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

// Hata durumunda log oluşturmak için fonksiyon
function logError(errorMessage) {
    const logFilePath = 'error_log.txt';
    const currentTime = new Date().toISOString();
    const logMessage = `${currentTime}: ${errorMessage}\n`;

    // Log dosyasına hata mesajını ekle
    fs.appendFile(logFilePath, logMessage, (err) => {
        if (err) {
            console.error("Error writing to log file:", err);
        } else {
            console.log("Error message logged successfully.");
        }
    });
}
