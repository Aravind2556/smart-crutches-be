const url = "https://api.thingspeak.com/channels/3173942/feeds.json?api_key=EFGSQBE4SVYAAKBW&results"
 const urlTwo = "https://api.thingspeak.com/channels/3174087/feeds.json?api_key=30ZY359FM8STMZLO&results"
 const temperatureRange = 50
 const batteryPercentageRange = 50
 const spo2Range = 95
 const minHeartRateRange = 60
 const maxHeartRateRange = 120

 module.exports = {
    url ,
    urlTwo,
    temperatureRange ,
    batteryPercentageRange ,
    spo2Range ,
    minHeartRateRange ,
    maxHeartRateRange
 }