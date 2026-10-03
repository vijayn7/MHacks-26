#!/usr/bin/env python3
"""Generate a dependency-free, deterministic Xcode project with two targets."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
objects = {}

def identifier(key):
    return hashlib.sha256(key.encode()).hexdigest()[:24].upper()

def add(key, isa, **values):
    uid = identifier(key)
    objects[uid] = dict(isa=isa, **values)
    return uid

def render(value, indent=0):
    if isinstance(value, dict):
        return "{\n" + "".join("\t" * (indent + 1) + json.dumps(k) + " = " + render(v, indent + 1) + ";\n" for k, v in value.items()) + "\t" * indent + "}"
    if isinstance(value, list):
        return "(" + ", ".join(render(v, indent) for v in value) + ")"
    return json.dumps(str(value))

shared = sorted(str(p.relative_to(ROOT)) for folder in ("Core", "Platform") for p in (ROOT / folder).glob("*.swift"))
app_sources = sorted(str(p.relative_to(ROOT)) for p in (ROOT / "App").glob("*.swift")) + shared
extension_sources = ["BroadcastExtension/SampleHandler.swift"] + shared
files = {}
for path in sorted(set(app_sources + extension_sources + ["Config/Shared.xcconfig", "App/Info.plist", "App/Pact.entitlements", "BroadcastExtension/Info.plist", "BroadcastExtension/Broadcast.entitlements"])):
    kind = "sourcecode.swift" if path.endswith(".swift") else "text.xcconfig" if path.endswith("xcconfig") else "text.plist.xml"
    files[path] = add(path, "PBXFileReference", lastKnownFileType=kind, path=path, sourceTree="<group>")

app_product = add("app-product", "PBXFileReference", explicitFileType="wrapper.application", path="Pact.app", sourceTree="BUILT_PRODUCTS_DIR")
ext_product = add("ext-product", "PBXFileReference", explicitFileType="wrapper.app-extension", path="PactBroadcast.appex", sourceTree="BUILT_PRODUCTS_DIR")
products = add("products", "PBXGroup", children=[app_product, ext_product], name="Products", sourceTree="<group>")
group = add("main-group", "PBXGroup", children=list(files.values()) + [products], sourceTree="<group>")

def configs(name, settings):
    refs = []
    for mode in ["Debug", "Release"]:
        build = dict(settings)
        build.update(SWIFT_OPTIMIZATION_LEVEL="-Onone" if mode == "Debug" else "-O", DEBUG_INFORMATION_FORMAT="dwarf" if mode == "Debug" else "dwarf-with-dsym")
        if mode == "Debug":
            build["SWIFT_ACTIVE_COMPILATION_CONDITIONS"] = "DEBUG"
        refs.append(add(name + mode, "XCBuildConfiguration", baseConfigurationReference=files["Config/Shared.xcconfig"], buildSettings=build, name=mode))
    return add(name + "-configs", "XCConfigurationList", buildConfigurations=refs, defaultConfigurationIsVisible=0, defaultConfigurationName="Release")

project_settings = dict(SDKROOT="iphoneos", CLANG_ENABLE_MODULES="YES", CLANG_ENABLE_OBJC_ARC="YES", ENABLE_USER_SCRIPT_SANDBOXING="YES", ALWAYS_SEARCH_USER_PATHS="NO")
project_configs = configs("project", project_settings)

def phases(name, sources):
    builds = [add(name + path, "PBXBuildFile", fileRef=files[path]) for path in sources]
    return [add(name + "-sources", "PBXSourcesBuildPhase", buildActionMask=2147483647, files=builds, runOnlyForDeploymentPostprocessing=0),
            add(name + "-frameworks", "PBXFrameworksBuildPhase", buildActionMask=2147483647, files=[], runOnlyForDeploymentPostprocessing=0),
            add(name + "-resources", "PBXResourcesBuildPhase", buildActionMask=2147483647, files=[], runOnlyForDeploymentPostprocessing=0)]

extension = add("extension", "PBXNativeTarget", buildConfigurationList=configs("extension", dict(
    PRODUCT_BUNDLE_IDENTIFIER="$(PACT_BUNDLE_PREFIX).Broadcast", PRODUCT_NAME="PactBroadcast",
    INFOPLIST_FILE="BroadcastExtension/Info.plist", CODE_SIGN_ENTITLEMENTS="BroadcastExtension/Broadcast.entitlements",
    APPLICATION_EXTENSION_API_ONLY="YES", SKIP_INSTALL="YES", LD_RUNPATH_SEARCH_PATHS=["$(inherited)", "@executable_path/Frameworks", "@executable_path/../../Frameworks"])),
    buildPhases=phases("extension", extension_sources), buildRules=[], dependencies=[], name="PactBroadcast", productName="PactBroadcast", productReference=ext_product, productType="com.apple.product-type.app-extension")
proxy = add("proxy", "PBXContainerItemProxy", containerPortal=identifier("project"), proxyType=1, remoteGlobalIDString=extension, remoteInfo="PactBroadcast")
dependency = add("dependency", "PBXTargetDependency", target=extension, targetProxy=proxy)
embed_build = add("embed-build", "PBXBuildFile", fileRef=ext_product, settings={"ATTRIBUTES": ["RemoveHeadersOnCopy"]})
embed = add("embed", "PBXCopyFilesBuildPhase", buildActionMask=2147483647, dstPath="", dstSubfolderSpec=13, files=[embed_build], name="Embed App Extensions", runOnlyForDeploymentPostprocessing=0)
app = add("app", "PBXNativeTarget", buildConfigurationList=configs("app", dict(
    PRODUCT_BUNDLE_IDENTIFIER="$(PACT_BUNDLE_PREFIX)", PRODUCT_NAME="Pact", INFOPLIST_FILE="App/Info.plist",
    CODE_SIGN_ENTITLEMENTS="App/Pact.entitlements", LD_RUNPATH_SEARCH_PATHS=["$(inherited)", "@executable_path/Frameworks"])),
    buildPhases=phases("app", app_sources) + [embed], buildRules=[], dependencies=[dependency], name="Pact", productName="Pact", productReference=app_product, productType="com.apple.product-type.application")
project = add("project", "PBXProject", attributes={"LastUpgradeCheck": "2600", "TargetAttributes": {
    app: {"CreatedOnToolsVersion": "26.0", "SystemCapabilities": {"com.apple.ApplicationGroups.iOS": {"enabled": 1}}},
    extension: {"CreatedOnToolsVersion": "26.0", "SystemCapabilities": {"com.apple.ApplicationGroups.iOS": {"enabled": 1}}}}},
    buildConfigurationList=project_configs, compatibilityVersion="Xcode 14.0", developmentRegion="en", hasScannedForEncodings=0,
    knownRegions=["en", "Base"], mainGroup=group, productRefGroup=products, projectDirPath="", projectRoot="", targets=[app, extension])

project_dir = ROOT / "Pact.xcodeproj"
project_dir.mkdir(exist_ok=True)
(project_dir / "project.pbxproj").write_text("// !$*UTF8*$!\n" + render(dict(archiveVersion=1, classes={}, objectVersion=56, objects=objects, rootObject=project)) + "\n")
scheme_dir = project_dir / "xcshareddata/xcschemes"
scheme_dir.mkdir(parents=True, exist_ok=True)
ref = f'<BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{app}" BuildableName="Pact.app" BlueprintName="Pact" ReferencedContainer="container:Pact.xcodeproj"/>'
(scheme_dir / "Pact.xcscheme").write_text(f'''<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="2600" version="1.3">
<BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES"><BuildActionEntries><BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES">{ref}</BuildActionEntry></BuildActionEntries></BuildAction>
<LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" allowLocationSimulation="YES"><BuildableProductRunnable runnableDebuggingMode="0">{ref}</BuildableProductRunnable></LaunchAction>
<ProfileAction buildConfiguration="Release" shouldUseLaunchSchemeArgsEnv="YES" savedToolIdentifier="" useCustomWorkingDirectory="NO" debugDocumentVersioning="YES"><BuildableProductRunnable runnableDebuggingMode="0">{ref}</BuildableProductRunnable></ProfileAction>
<AnalyzeAction buildConfiguration="Debug"/>
<ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/>
</Scheme>
''')
print("Generated Pact.xcodeproj")
