import { Config } from "../src/Core/Config";
import { KeyValue } from "../src/Core/KeyValue";
import { BaseAutomator } from "../src/Core/Providers/Base/BaseAutomator";
import { TwitchAutomator } from "../src/Core/Providers/Twitch/TwitchAutomator";
import { TwitchChannel } from "../src/Core/Providers/Twitch/TwitchChannel";
import { mp4VideoTagOptions } from "../src/Helpers/Video";
import "./environment";
// jest.mock("Automator");
// jest.mock("KeyValue");

describe("Automator", () => {
    it("automator templating", () => {
        const TA = new BaseAutomator();
        TA.broadcaster_user_login = "test";
        const channel = new TwitchChannel();
        channel.channel_data = {
            login: "test",
            _updated: 1,
            cache_offline_image: "",
            profile_image_url: "",
            offline_image_url: "",
            created_at: "",
            id: "test",
            avatar_cache: "",
            avatar_thumb: "",
            broadcaster_type: "partner",
            display_name: "Test",
            type: "",
            description: "",
            view_count: 0,
        };
        TA.channel = channel;

        const kv = KeyValue.getInstance();
        // const spy = jest.spyOn(kv, "get").mockImplementation((key) => {
        //     return "2022-09-02T16:10:37Z";
        // });

        kv.set("test.vod.started_at", "2022-09-02T16:10:37Z");

        expect(TA.getStartDate()).toBe("2022-09-02T16:10:37Z");

        // spy.mockRestore();

        Config.getInstance().setConfig(
            "filename_vod",
            "{internalName}_{year}_{month}_{day}"
        );
        expect(TA.vodBasenameTemplate()).toBe("test_2022_09_02");

        kv.delete("test.vod.started_at");

        expect(TA.vodBasenameTemplate()).toBe("test_{year}_{month}_{day}");

        // spy.mockRestore();
    });

    it("twitch supported codecs", () => {
        const TA = new TwitchAutomator();

        Config.getInstance().setConfig(
            "capture.twitch-supported-codecs",
            "h264"
        );
        expect(TA.providerArgs()).not.toContain("--twitch-supported-codecs");

        Config.getInstance().setConfig(
            "capture.twitch-supported-codecs",
            "h264,h265"
        );
        const args = TA.providerArgs();
        const index = args.indexOf("--twitch-supported-codecs");
        expect(index).toBeGreaterThan(-1);
        expect(args[index + 1]).toBe("h264,h265");

        Config.getInstance().setConfig(
            "capture.twitch-supported-codecs",
            "h264"
        );
    });
});

describe("Video", () => {
    it("tags hevc as hvc1 in mp4", () => {
        expect(mp4VideoTagOptions("hevc")).toEqual(["-tag:v", "hvc1"]);
        expect(mp4VideoTagOptions("h264")).toEqual([]);
        expect(mp4VideoTagOptions(undefined)).toEqual([]);
    });
});
