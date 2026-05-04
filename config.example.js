module.exports = {
    debug: true,
    api: {
        port: 30600,
        token: "your-api-token"
    },
    minecraft: {
        ip: "127.0.0.1:25565",
        args: [
            `java`,
            `-Dfile.encoding=UTF-8`,
            `-Dsun.stdout.encoding=UTF-8`,
            `-Dsun.stderr.encoding=UTF-8`,
            `-jar`,
            `"server.jar"`
        ],
        cwd: "./server",
        autoRestart: {
            enable: true,
            sendQQBotMessage: true
        },
        logRegexs: {
            playerJoin: /^\[(\d{2}:\d{2}:\d{2}) INFO\]: (\S+) joined the game$/,
            playerQuit: /^\[(\d{2}:\d{2}:\d{2}) INFO\]: (\S+) left the game$/,
            playerSendMessage: /^\[(\d{2}:\d{2}:\d{2}) INFO\]: <(\S+)> (.+)$/,
            playerSendCommand: /^\[(\d{2}:\d{2}:\d{2}) INFO\]: (\S+) issued server command: \/(.+)$/
        }
    },
    qqbot: {
        server: "http://127.0.0.1:3000",
        token: "your-qqbot-token",
        groupIds: [123456789],
        autoRestartMessage: "服务器已于 {time} 自动重启"
    }
}
