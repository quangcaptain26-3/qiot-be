/**
 * MQTT Client - Kết nối đến EMQX MQTT Broker
 * Xử lý các kết nối MQTT đến external broker
 */

import mqtt from "mqtt";
import { config } from "./config.js";
import { LogModel } from "./models/Log.js";

let mqttClientInstance = null;
let logModel = null;

/**
 * Khởi tạo MQTT Client để kết nối đến EMQX broker
 * @param {Object} db - Database instance
 * @returns {Promise<Object>} MQTT client instance
 */
export function initMqttClient(db) {
  return new Promise((resolve, reject) => {
    try {
      logModel = new LogModel(db);

      // Tạo connection options với credentials
      const options = {
        clientId: config.mqtt.clientId || "qiot-be",
        username: config.mqtt.username,
        password: config.mqtt.password,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30000,
      };

      // Sử dụng mqtts:// cho TLS/SSL
      const protocol = config.mqtt.useTLS ? "mqtts://" : "mqtt://";
      const brokerUrl = `${protocol}${config.mqtt.host}:${config.mqtt.port}`;

      console.log(`📡 Đang kết nối đến MQTT broker: ${brokerUrl}`);
      console.log(`   Client ID: ${options.clientId}`);
      console.log(`   Username: ${options.username}`);

      // Tạo MQTT client instance
      mqttClientInstance = mqtt.connect(brokerUrl, options);

      // Log khi client kết nối
      mqttClientInstance.on("connect", () => {
        console.log("✅ MQTT Client đã kết nối đến broker");
        resolve(mqttClientInstance);
      });

      // Log khi client ngắt kết nối
      mqttClientInstance.on("close", () => {
        console.log("🔌 MQTT Client đã ngắt kết nối");
      });

      // Log khi client reconnect
      mqttClientInstance.on("reconnect", () => {
        console.log("🔄 MQTT Client đang kết nối lại...");
      });

      // Log khi có message được publish (nếu subscribe)
      mqttClientInstance.on("message", async (topic, message) => {
        const msg = message.toString();
        console.log(`📨 Nhận message từ ${topic}: ${msg.substring(0, 50)}`);

        // Lưu log vào database
        try {
          await logModel.save({
            topic: topic,
            message: msg,
            direction: "subscribe",
          });
        } catch (error) {
          console.error("❌ Lỗi lưu log:", error);
        }
      });

      // Xử lý lỗi
      mqttClientInstance.on("error", (error) => {
        console.error("❌ MQTT Client error:", error);
        reject(error);
      });

      // Xử lý offline
      mqttClientInstance.on("offline", () => {
        console.log("⚠️  MQTT Client offline");
      });
    } catch (error) {
      console.error("❌ Lỗi khởi tạo MQTT Client:", error);
      reject(error);
    }
  });
}

/**
 * Lấy MQTT client instance
 */
export function getMqttClient() {
  return mqttClientInstance;
}

/**
 * Publish message qua MQTT client
 * @param {string} topic - MQTT topic
 * @param {string} message - Message content
 * @param {Object} options - Publish options
 */
export function publish(topic, message, options = {}) {
  if (!mqttClientInstance) {
    console.error("❌ MQTT Client chưa được khởi tạo");
    return;
  }

  if (!mqttClientInstance.connected) {
    console.error("❌ MQTT Client chưa kết nối");
    return;
  }

  const publishOptions = {
    qos: options.qos || 0,
    retain: options.retain || false,
  };

  mqttClientInstance.publish(topic, message, publishOptions, (error) => {
    if (error) {
      console.error(`❌ Lỗi publish đến ${topic}:`, error);
    } else {
      console.log(`📤 Đã publish đến ${topic}`);
    }
  });
}

/**
 * Đóng MQTT Client
 */
export function closeMqttClient() {
  return new Promise((resolve) => {
    if (mqttClientInstance) {
      mqttClientInstance.end(() => {
        console.log("✅ Đã đóng MQTT Client");
        mqttClientInstance = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

