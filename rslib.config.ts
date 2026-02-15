import { NodeLibraryBuilder } from "@savvy-web/rslib-builder";

export default NodeLibraryBuilder.create({
	format: ["esm", "cjs"],
	cjsInterop: true,
	transform({ pkg }) {
		delete pkg.devDependencies;
		pkg.scripts = {
			postinstall: "savvy-changesets init --check",
		};
		delete pkg.publishConfig;
		delete pkg.packageManager;
		delete pkg.devEngines;
		return pkg;
	},
});
