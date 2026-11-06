import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Config } from "../src/Core/Config";
import { KeyValue } from "../src/Core/KeyValue";
import { LiveStreamDVR } from "../src/Core/LiveStreamDVR";
import { BaseAutomator } from "../src/Core/Providers/Base/BaseAutomator";
import { TwitchAutomator } from "../src/Core/Providers/Twitch/TwitchAutomator";
import { TwitchChannel } from "../src/Core/Providers/Twitch/TwitchChannel";
import { TwitchVOD } from "../src/Core/Providers/Twitch/TwitchVOD";
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
    it("forced capture of an already captured stream becomes a new part", async () => {
        const channel = new TwitchChannel();
        channel.channel_data = {
            login: "partuser",
            _updated: 1,
            cache_offline_image: "",
            profile_image_url: "",
            offline_image_url: "",
            created_at: "",
            id: "partuser",
            avatar_cache: "",
            avatar_thumb: "",
            broadcaster_type: "partner",
            display_name: "PartUser",
            type: "",
            description: "",
            view_count: 0,
        };

        const kv = KeyValue.getInstance();
        kv.set("partuser.vod.id", "123");
        kv.set("partuser.vod.started_at", "2026-11-05T18:00:52Z");
        Config.getInstance().setConfig("filename_vod", "{internalName}_{id}");
        Config.getInstance().setConfig("capture.fallbackcapture", false);

        const stopped = new TwitchVOD();
        stopped.basename = "partuser_123";
        stopped.capture_id = "123";
        LiveStreamDVR.getInstance().addVod(stopped);

        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lsdvr-part-"));
        const createVOD = jest
            .spyOn(channel, "createVOD")
            .mockRejectedValue(new Error("stop before capturing"));

        // automatic captures still refuse an existing stream
        const automatic = new TwitchAutomator();
        automatic.broadcaster_user_login = "partuser";
        automatic.channel = channel;
        jest.spyOn(automatic, "fulldir").mockReturnValue(dir);
        expect(await automatic.download()).toBe(false);
        expect(createVOD).not.toHaveBeenCalled();

        const forced = new TwitchAutomator();
        forced.broadcaster_user_login = "partuser";
        forced.channel = channel;
        forced.force_record = true;
        jest.spyOn(forced, "fulldir").mockReturnValue(dir);
        expect(await forced.download()).toBe(false);
        expect(createVOD).toHaveBeenCalledWith(
            path.join(dir, "partuser_123_part2.json"),
            "123"
        );

        // chapter updates go to the capturing part
        const capturing = new TwitchVOD();
        capturing.basename = "partuser_123_part2";
        capturing.capture_id = "123";
        capturing.is_capturing = true;
        LiveStreamDVR.getInstance().addVod(capturing);
        expect(TwitchVOD.getVodByCaptureId("123")).toBe(capturing);

        LiveStreamDVR.getInstance().clearVods();
        kv.delete("partuser.vod.id");
        kv.delete("partuser.vod.started_at");
        fs.rmSync(dir, { recursive: true });
    });
});

describe("Video", () => {
    it("tags hevc as hvc1 in mp4", () => {
        expect(mp4VideoTagOptions("hevc")).toEqual(["-tag:v", "hvc1"]);
        expect(mp4VideoTagOptions("h264")).toEqual([]);
        expect(mp4VideoTagOptions(undefined)).toEqual([]);
    });
});
