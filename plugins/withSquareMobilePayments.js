const { withDangerousMod, withXcodeProject } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MOBILE_PAYMENTS_BUILD_PHASE_NAME = "Square Framework Run Script - MobilePaymentsSDK";

const withSquareAppliedInAppDelegate = (config) =>
    withDangerousMod(config, [
        "ios",
        async (config) => {
            const projectName = config.modRequest.projectName ?? path.basename(config.modRequest.projectRoot);
            const appDelegateSwiftPath = path.join(
                config.modRequest.projectRoot,
                "ios",
                projectName,
                "AppDelegate.swift"
            );
            const appDelegateObjCPath = path.join(
                config.modRequest.projectRoot,
                "ios",
                projectName,
                "AppDelegate.mm"
            );

            const squareAppID = process.env.EXPO_PUBLIC_SQUARE_APP_ID;
            if (!squareAppID) {
                console.warn("⚠️ EXPO_PUBLIC_SQUARE_APP_ID environment variable not set");
            }

            // Handle Swift AppDelegate (Expo SDK 54+)
            if (fs.existsSync(appDelegateSwiftPath)) {
                let appDelegate = fs.readFileSync(appDelegateSwiftPath, "utf8");

                // Add import if not present
                const importLine = "import SquareMobilePaymentsSDK";
                if (!appDelegate.includes(importLine)) {
                    const importRegex = /^import .+$/gm;
                    let lastImportMatch = null;
                    let match;
                    while ((match = importRegex.exec(appDelegate)) !== null) {
                        lastImportMatch = match;
                    }
                    if (lastImportMatch) {
                        const insertIndex = lastImportMatch.index + lastImportMatch[0].length;
                        appDelegate = appDelegate.slice(0, insertIndex)
                            + "\n" + importLine
                            + appDelegate.slice(insertIndex);
                    }
                }

                // Insert initialization in didFinishLaunchingWithOptions for Swift
                const didFinishRegex = /(public override func application\(\s*_ application: UIApplication,\s*didFinishLaunchingWithOptions launchOptions: \[UIApplication\.LaunchOptionsKey: Any\]\? = nil\s*\) -> Bool \{)/;
                if (didFinishRegex.test(appDelegate) && !appDelegate.includes("MobilePaymentsSDK.initialize")) {
                    appDelegate = appDelegate.replace(
                        didFinishRegex,
                        (match) => {
                            const initLine = `    MobilePaymentsSDK.initialize(applicationLaunchOptions: launchOptions, squareApplicationID: "${squareAppID}")`;
                            return `${match}\n${initLine}\n`;
                        }
                    );
                }

                fs.writeFileSync(appDelegateSwiftPath, appDelegate);
                console.log("✅ Added Square SDK initialization to AppDelegate.swift");
            }
            // Handle Objective-C AppDelegate (older Expo versions)
            else if (fs.existsSync(appDelegateObjCPath)) {
                let appDelegate = fs.readFileSync(appDelegateObjCPath, "utf8");

                // Add import if not present
                const importLine = '#import "SquareMobilePaymentsSDK/SquareMobilePaymentsSDK-Swift.h"';
                if (!appDelegate.includes(importLine)) {
                    const importRegex = /^#import .+$/gm;
                    let lastImportMatch = null;
                    let match;
                    while ((match = importRegex.exec(appDelegate)) !== null) {
                        lastImportMatch = match;
                    }
                    if (lastImportMatch) {
                        const insertIndex = lastImportMatch.index + lastImportMatch[0].length;
                        appDelegate = appDelegate.slice(0, insertIndex)
                            + "\n" + importLine
                            + appDelegate.slice(insertIndex);
                    } else {
                        appDelegate = importLine + "\n" + appDelegate;
                    }
                }

                // Insert initialization in didFinishLaunchingWithOptions
                const didFinishRegex = /(-\s*\(BOOL\)\s*application:\(UIApplication \*\)application\s*didFinishLaunchingWithOptions:\(NSDictionary \*\)launchOptions\s*\{)([\s\S]*?)(return\s+\[super application:application didFinishLaunchingWithOptions:launchOptions\];)/;
                if (didFinishRegex.test(appDelegate)) {
                    appDelegate = appDelegate.replace(
                        didFinishRegex,
                        (match, start, body, ret) => {
                            if (body.includes("[SQMPMobilePaymentsSDK initializeWithApplicationLaunchOptions:")) {
                                return match;
                            }
                            const initLine = `    [SQMPMobilePaymentsSDK initializeWithApplicationLaunchOptions:launchOptions squareApplicationID:@"${squareAppID}"];`;
                            return `${start}\n${initLine}\n${body}${ret}`;
                        }
                    );
                }

                fs.writeFileSync(appDelegateObjCPath, appDelegate);
                console.log("✅ Added Square SDK initialization to AppDelegate.mm");
            }
            return config;
        },
    ]);

const addMobilePaymentsBuildPhaseForSquareIOS = (config) =>
    withXcodeProject(config, async (conf) => {
        const project = conf.modResults;
        project.addBuildPhase(
            [],
            "PBXShellScriptBuildPhase",
            MOBILE_PAYMENTS_BUILD_PHASE_NAME,
            project.getFirstTarget().uuid,
            {
                shellPath: "/bin/sh",
                shellScript: `SETUP_SCRIPT="\${BUILT_PRODUCTS_DIR}/\${FRAMEWORKS_FOLDER_PATH}/SquareMobilePaymentsSDK.framework/setup"
if [ -f "$SETUP_SCRIPT" ]; then
echo "✅ Found Square MobilePayments setup script. Executing..."
"$SETUP_SCRIPT"
else
echo "⚠️ Square MobilePayments setup script not found at $SETUP_SCRIPT"
fi`,
            }
        );
        return conf;
    });

const copyCorePaymentCardFramework = (config) =>
    withDangerousMod(config, ["ios", async (config) => {
        const root = config.modRequest.projectRoot;
        const src = path.join(
            root,
            "node_modules",
            "square-mobile-payments-sdk-ios",
            "CorePaymentCard.framework"
        );
        const dest = path.join(root, "ios", "CorePaymentCard.framework");
        if (fs.existsSync(src) && !fs.existsSync(dest)) {
            fs.cpSync(src, dest, { recursive: true });
            console.log("✅ Copied CorePaymentCard.framework");
        }
        return config;
    }]);

const withSquareMobilePayments = (config) => {
    config = addMobilePaymentsBuildPhaseForSquareIOS(config);
    config = withSquareAppliedInAppDelegate(config);
    config = copyCorePaymentCardFramework(config);
    return config;
};

module.exports = withSquareMobilePayments;
