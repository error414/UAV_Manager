---
icon: file-prescription
---

# Flight Data Logging with Lua Scripts

With these two Lua scripts, `flylog.lua` and `tellog.lua`, all flight hours and telemetry data can be automatically recorded on the EdgeTX transmitter (TX). The generated logs can then be imported and visualized in the **UAV Manager**.\


GitHub repository for the Lua scripts: [https://github.com/CarviFPV/flylog\_edgetx](https://github.com/CarviFPV/flylog_edgetx)

### Installation



1. **Download/Obtain the Script**\
   Save the `flylog.lua` file into the `SCRIPTS/FUNCTIONS` directory on your EdgeTX SD card.
2.  **Configure the Script in EdgeTX**

    1. On your EdgeTX transmitter, open the **Model** page and navigate to the **Special Functions** tab.
    2. Create a new special function (tap the `+` icon). [![Printscreen 1: Special Function setup for flylog.lua](https://github.com/CarviFPV/flylog_edgetx/raw/main/screenshots/1_special_functions_tab.png)](https://github.com/CarviFPV/flylog_edgetx/blob/main/screenshots/1_special_functions_tab.png)
    3. Under **Trigger**, select the switch you want to use to start/stop logging (e.g., your arming switch).
    4. Under **Function**, choose **Lua Script**.
    5. Under **Value**, select `flylog.lua`.
    6. Set **Repeat** to **ON**.
    7.  Make sure **Enable** is toggled on.

        [![Printscreen 2: Enable Special Function](https://github.com/CarviFPV/flylog_edgetx/raw/main/screenshots/2_special_functions.png)](https://github.com/CarviFPV/flylog_edgetx/blob/main/screenshots/2_special_functions.png)

    Refer to the provided screenshots for an example of how this is set up.

#### tellog.lua



1. **Download/Obtain the Script**\
   Save the `tellog.lua` file into the `SCRIPTS/FUNCTIONS` directory on your EdgeTX SD card.
2.  **Configure the Script in EdgeTX**\
    The setup is the same as for `flylog.lua`:

    1. On your EdgeTX transmitter, open the **Model** page and navigate to the **Special Functions** tab.
    2.  Create a new special function (tap the `+` icon).

        [![Printscreen 1: Special Function setup for tellog.lua](https://github.com/CarviFPV/flylog_edgetx/raw/main/screenshots/edge-tx_settings.png)](https://github.com/CarviFPV/flylog_edgetx/blob/main/screenshots/edge-tx_settings.png)

        1 special functions

        2 flylog.lua script

        3 tellog.lua script
    3. Under **Trigger**, select the switch you want to use to start/stop logging (e.g., your arming switch).
    4. Under **Function**, choose **Lua Script**.
    5. Under **Value**, select `tellog.lua`.
    6. Set **Repeat** to **ON**.
    7.  Make sure **Enable** is toggled on.

        [![Printscreen 2: Enable Special Function](https://github.com/CarviFPV/flylog_edgetx/raw/main/screenshots/spezial_function_tellog.png)](https://github.com/CarviFPV/flylog_edgetx/blob/main/screenshots/spezial_function_tellog.png)

    Refer to the provided screenshots for an example of how this is set up.

#### ExpressLRS Settings

A. Click on SYS and go to the Tools tab. B. There you should see the ExpressLRS script.

[![Edegtx Tools](https://github.com/CarviFPV/flylog_edgetx/raw/main/screenshots/edgetx-tools.png)](https://github.com/CarviFPV/flylog_edgetx/blob/main/screenshots/edgetx-tools.png)

C. Then you should set the following:

[![Edegtx Tools](https://github.com/CarviFPV/flylog_edgetx/raw/main/screenshots/elrs_settings.png)](https://github.com/CarviFPV/flylog_edgetx/blob/main/screenshots/elrs_settings.png)

1. Packet Ratio = 250HZ
2. Telemetry Ratio = 8



**Note:** The default Packet Ratio of 250Hz is fine, but the standard Telemetry Ratio is too high and should be set to 8. If you use a different Packet Ratio, you will need to find the best Telemetry Ratio for your setup, as it always depends on the Packet Ratio. If the Telemetry Ratio is too high, you will get less data, which can make the telemetry look messy in the UAV Manager when analyzing your flight data.

