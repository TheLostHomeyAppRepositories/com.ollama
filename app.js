'use strict';

const Homey = require('homey');
const axios = require('axios');

module.exports = class MyApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('Ollama has been initialized');
    const generateResponseCard = this.homey.flow.getActionCard("generate_response");
    generateResponseCard.registerArgumentAutocompleteListener(
      "model",
      async (query, args) => {
        try {
          const ollamaIp = await this.homey.settings.get('ip');
          const ollamaPort = await this.homey.settings.get('port');
          if (!ollamaIp || !ollamaPort) {
            this.error('Ollama IP or port not set in settings. Please visit the app settings to connect to your Ollama instance.');
            return [];
          }
          const ollamaUrl = `http://${ollamaIp}:${ollamaPort}`;
          const response = await axios.get(`${ollamaUrl}/api/tags`);
          const data = await response.data;
          const results = data.models.map(m => ({
            name: m.model, // use only the model field
            id: m.model     // id can also be the model name
          }));
          return results.filter(result =>
            result.name.toLowerCase().includes(query.toLowerCase())
          );
        } catch (error) {
          this.error('Error fetching models from Ollama:', error);
          return [];
        }
    });
    generateResponseCard.registerRunListener(async (args, state) => {
      try {
        const ollamaIp = await this.homey.settings.get('ip');
        const ollamaPort = await this.homey.settings.get('port');
        const systemPrompt = await this.homey.settings.get('systemPrompt');
        if (!systemPrompt) {
          this.error('Please set a system prompt in the app settings.');
        }
        if (!ollamaIp || !ollamaPort) {
          this.error('Ollama IP or port not set in settings. Please visit the app settings to connect to your Ollama instance.');
          throw new Error('Ollama IP or port not set in settings.');
        }
        const ollamaUrl = `http://${ollamaIp}:${ollamaPort}`;
        const payload = {
          model: args.model.id,
          prompt: args.prompt,
          system: systemPrompt || "You are an Assistant for Homey Pro. Users send messages and you should generate a response. Always respond friendly and give detailed responses.",
          stream: false
        };
        const response = await axios.post(`${ollamaUrl}/api/generate`, payload);
        const data = await response.data;
        return {
          response: data.response
        };
      }
      
      catch (error) {
        this.error('Error generating response from Ollama:', error);
        throw new Error('Error generating response from Ollama.');
      }
    });  
  }
};
