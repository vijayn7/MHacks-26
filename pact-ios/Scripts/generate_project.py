#!/usr/bin/env python3
"""Generate Pact, ReplayKit, shield configuration and shield action targets."""
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
objects = {}
previous_objects = {}
existing_project = ROOT / "Pact.xcodeproj/project.pbxproj"
if existing_project.exists():
    previous_objects = json.loads(subprocess.check_output([
        "plutil", "-convert", "json", "-o", "-", str(existing_project)
    ]))["objects"]

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
shield_targets = [
    ("shield-config", "PactShieldConfiguration", "ShieldConfigurationExtension"),
    ("shield-action", "PactShieldAction", "ShieldActionExtension"),
]
shield_sources = {key: sorted(str(p.relative_to(ROOT)) for p in (ROOT / folder).glob("*.swift")) + shared for key, _, folder in shield_targets}
shield_files = [path for sources in shield_sources.values() for path in sources]
shield_files += [folder + suffix for _, _, folder in shield_targets for suffix in ["/Info.plist", "/Shield.entitlements"]]
files = {}
for path in sorted(set(app_sources + extension_sources + shield_files + ["Config/Shared.xcconfig", "App/Info.plist", "App/Pact.entitlements", "BroadcastExtension/Info.plist", "BroadcastExtension/Broadcast.entitlements"])):
    kind = "sourcecode.swift" if path.endswith(".swift") else "text.xcconfig" if path.endswith("xcconfig") else "text.plist.xml"
    files[path] = add(path, "PBXFileReference", lastKnownFileType=kind, path=path, sourceTree="<group>")

app_product = add("app-product", "PBXFileReference", explicitFileType="wrapper.application", path="Pact.app", sourceTree="BUILT_PRODUCTS_DIR")
ext_product = add("ext-product", "PBXFileReference", explicitFileType="wrapper.app-extension", path="PactBroadcast.appex", sourceTree="BUILT_PRODUCTS_DIR")
shield_products = {key: add(key + "-product", "PBXFileReference", explicitFileType="wrapper.app-extension", path=name + ".appex", sourceTree="BUILT_PRODUCTS_DIR") for key, name, _ in shield_targets}
products = add("products", "PBXGroup", children=[app_product, ext_product] + list(shield_products.values()), name="Products", sourceTree="<group>")
group = add("main-group", "PBXGroup", children=list(files.values()) + [products], sourceTree="<group>")

def configs(name, settings):
    refs = []
    for mode in ["Debug", "Release"]:
        build = dict(settings)
        build.update(SWIFT_OPTIMIZATION_LEVEL="-Onone" if mode == "Debug" else "-O", DEBUG_INFORMATION_FORMAT="dwarf" if mode == "Debug" else "dwarf-with-dsym")
        if mode == "Debug":
            build["SWIFT_ACTIVE_COMPILATION_CONDITIONS"] = "DEBUG"
        # Preserve the team's signing and other existing target overrides.
        build.update(previous_objects.get(identifier(name + mode), {}).get("buildSettings", {}))
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
shield_extensions = []
shield_dependencies = []
shield_embeds = []
for key, name, folder in shield_targets:
    target = add(key, "PBXNativeTarget", buildConfigurationList=configs(key, dict(
        PRODUCT_BUNDLE_IDENTIFIER="$(PACT_BUNDLE_PREFIX)." + name, PRODUCT_NAME=name,
        INFOPLIST_FILE=folder + "/Info.plist", CODE_SIGN_ENTITLEMENTS=folder + "/Shield.entitlements",
        APPLICATION_EXTENSION_API_ONLY="YES", SKIP_INSTALL="YES",
        LD_RUNPATH_SEARCH_PATHS=["$(inherited)", "@executable_path/Frameworks", "@executable_path/../../Frameworks"])),
        buildPhases=phases(key, shield_sources[key]), buildRules=[], dependencies=[], name=name,
        productName=name, productReference=shield_products[key], productType="com.apple.product-type.app-extension")
    shield_extensions.append(target)
    proxy_id = add(key + "-proxy", "PBXContainerItemProxy", containerPortal=identifier("project"), proxyType=1, remoteGlobalIDString=target, remoteInfo=name)
    shield_dependencies.append(add(key + "-dependency", "PBXTargetDependency", target=target, targetProxy=proxy_id))
    shield_embeds.append(add(key + "-embed", "PBXBuildFile", fileRef=shield_products[key], settings={"ATTRIBUTES": ["RemoveHeadersOnCopy"]}))
proxy = add("proxy", "PBXContainerItemProxy", containerPortal=identifier("project"), proxyType=1, remoteGlobalIDString=extension, remoteInfo="PactBroadcast")
dependency = add("dependency", "PBXTargetDependency", target=extension, targetProxy=proxy)
embed_build = add("embed-build", "PBXBuildFile", fileRef=ext_product, settings={"ATTRIBUTES": ["RemoveHeadersOnCopy"]})
embed = add("embed", "PBXCopyFilesBuildPhase", buildActionMask=2147483647, dstPath="", dstSubfolderSpec=13, files=[embed_build] + shield_embeds, name="Embed App Extensions", runOnlyForDeploymentPostprocessing=0)
app = add("app", "PBXNativeTarget", buildConfigurationList=configs("app", dict(
    PRODUCT_BUNDLE_IDENTIFIER="$(PACT_BUNDLE_PREFIX)", PRODUCT_NAME="Pact", INFOPLIST_FILE="App/Info.plist",
    CODE_SIGN_ENTITLEMENTS="App/Pact.entitlements", LD_RUNPATH_SEARCH_PATHS=["$(inherited)", "@executable_path/Frameworks"])),
    buildPhases=phases("app", app_sources) + [embed], buildRules=[], dependencies=[dependency] + shield_dependencies, name="Pact", productName="Pact", productReference=app_product, productType="com.apple.product-type.application")
project = add("project", "PBXProject", attributes={"LastUpgradeCheck": "2600", "TargetAttributes": {
    app: {"CreatedOnToolsVersion": "26.0", "SystemCapabilities": {"com.apple.ApplicationGroups.iOS": {"enabled": 1}}},
    extension: {"CreatedOnToolsVersion": "26.0", "SystemCapabilities": {"com.apple.ApplicationGroups.iOS": {"enabled": 1}}}}},
    buildConfigurationList=project_configs, compatibilityVersion="Xcode 14.0", developmentRegion="en", hasScannedForEncodings=0,
    knownRegions=["en", "Base"], mainGroup=group, productRefGroup=products, projectDirPath="", projectRoot="", targets=[app, extension] + shield_extensions)
for target in [app, extension] + shield_extensions:
    attributes = objects[project]["attributes"]["TargetAttributes"].setdefault(target, {"CreatedOnToolsVersion": "26.0"})
    attributes.setdefault("SystemCapabilities", {}).update({
        "com.apple.ApplicationGroups.iOS": {"enabled": 1}, "com.apple.FamilyControls": {"enabled": 1}
    })

project_dir = ROOT / "Pact.xcodeproj"
project_dir.mkdir(exist_ok=True)
(project_dir / "project.pbxproj").write_text("// !$*UTF8*$!\n" + render(dict(archiveVersion=1, classes={}, objectVersion=56, objects=objects, rootObject=project)) + "\n")
scheme_dir = project_dir / "xcshareddata/xcschemes"
scheme_dir.mkdir(parents=True, exist_ok=True)
ref = f'<BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{app}" BuildableName="Pact.app" BlueprintName="Pact" ReferencedContainer="container:Pact.xcodeproj"/>'
scheme_text = f'''<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="2600" version="1.3">
<BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES"><BuildActionEntries><BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES">{ref}</BuildActionEntry></BuildActionEntries></BuildAction>
<LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" allowLocationSimulation="YES"><BuildableProductRunnable runnableDebuggingMode="0">{ref}</BuildableProductRunnable></LaunchAction>
<ProfileAction buildConfiguration="Release" shouldUseLaunchSchemeArgsEnv="YES" savedToolIdentifier="" useCustomWorkingDirectory="NO" debugDocumentVersioning="YES"><BuildableProductRunnable runnableDebuggingMode="0">{ref}</BuildableProductRunnable></ProfileAction>
<AnalyzeAction buildConfiguration="Debug"/>
<ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/>
</Scheme>
'''
# Preserve user launch arguments, test plans and debugging settings.
scheme_path = scheme_dir / "Pact.xcscheme"
if not scheme_path.exists():
    scheme_path.write_text(scheme_text)
print("Generated Pact.xcodeproj")
