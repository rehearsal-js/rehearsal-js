import Service from "@ember/service";

export default class LocaleService extends Service {
  current() {
    return "en-US";
  }
}
