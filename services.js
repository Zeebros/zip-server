const fs = require("fs");
const contentstack = require("contentstack");
const { fstat } = require("fs");
const axios = require('axios');
const ciqlJson = require("ciql-json");
const AdmZip = require("adm-zip");
const zipLocal = require("zip-local");
const path = require("path");
const { callbackify } = require("util");
var FormData = require('form-data');

const getentry = (res) => {
	const Stack = contentstack.Stack({ "api_key": "blt25772735bdf27ede", "delivery_token": "csc65545a83409f07271a3fa7b", "environment": "prod" });
	const Query = Stack.ContentType("web_tiles").Entry("blt02a3369e166d8a12");
	Query.includeContentType()
		.fetch()
		.then(
			function success(entry) {
				//console.log(entry); // Retrieve field value by providing a field's uid
				//console.log(entry.toJSON()); // Convert the entry result object to JSON

				const entryData = entry.toJSON();
				const filename = "./public/Localize/" + entryData.uid + ".json";

				let data = JSON.stringify(entryData);
				fs.writeFileSync(filename, data);

				copyEntry(res, entryData.uid);
			},
			function error(err) {
				// err objectd
				res.status(500).send(err);
			}
		);
};

function copyEntry(res, fileUid) {
	{
		const config = {
			method: 'get',
			url: 'https://api.contentstack.io/v3/locales',
			headers: {
				'api_key': 'blt25772735bdf27ede',
				'authorization': 'cs775bb62b020eb66c78580ea6',
				'Content-Type': 'application/json'
			}
		};

		axios(config)
			.then(function (response) {
				//console.log(JSON.stringify(response.data));
				//for each locale code
				for (let i = 0; i < response.data.locales.length; i++) {
					//console.log(response.data.locales[i].code)

					const dir = "./public/Localize";
					const des = "./public/copies/";
					const files = fs.readdirSync(dir);

					for (const file of files) {
						//console.log(file);
						//console.log(des + file);

						const localename = response.data.locales[i].code + "-";
						const newfile = des + localename + file;

						// File destination.txt will be created or overwritten by default.
						fs.copyFile(dir + "/" + file, newfile, (err) => {
							if (err) throw err;
							//console.log(newfile + " was copied to " + des);
						});
					}
				};
				updateEntry();
				zipEntry();
				cleanEntry();
				cleanCopies();
				res.status(200).send({ zipfilePath: 'public/zip/' + fileUid + '.zip' });
			})
			.catch(function (error) {
				res.status(500).send(error);
			});
	}
};

function updateEntry() {
	try {
		const from = "./public/Localize";
		const dir = "./public/copies";
		const pfiles = fs.readdirSync(from);
		const files = fs.readdirSync(dir);

		for (const file of files) {
			const dirPath = dir + "/" + file;

			var file_content = fs.readFileSync(dirPath);
			var content = JSON.parse(file_content);
			var locale = content.locale;
			var newlocale = file.replace("-" + pfiles, "");

			//console.log(locale);
			//console.log(newlocale);

			ciqlJson.open(dirPath).set("locale", newlocale).save();
		}
	} catch (error) {
		throw new Error(error);
	}
};

function zipEntry() {
	try {
		const inputDir = "./public/Localize";
		const outputDir = "./public/zip/";
		const files = fs.readdirSync(inputDir)

		for (const file of files) {
			//console.log(file);
			//console.log(outputDir + file);
			const zipfile = file.replace(".json", "") + ".zip";
			// const zipfile = "download.zip";

			zipLocal.sync
				.zip("./public/copies")
				.compress()
				.save(outputDir + zipfile);
		}
	} catch (error) {
		throw new Error(error);
	}
};

function cleanEntry() {
	var locdirectory = "./public/Localize";
	fs.readdir(locdirectory, (err, files) => {
		if (err) throw err;

		for (const file of files) {
			fs.unlink(path.join(locdirectory, file), (err) => {
				if (err) throw err;
			});
		}
	});
};

function cleanCopies() {
	var locdirectory = "./public/copies";

	fs.readdir(locdirectory, (err, files) => {
		if (err) throw err;

		for (const file of files) {
			fs.unlink(path.join(locdirectory, file), (err) => {
				if (err) throw err;
			});
		}
	});
};

function fromDir() {
	const startPath = './public/uploads';
	const filter = '.zip';
	if (!fs.existsSync(startPath)) {
		console.log("no dir ", startPath);
		return;
	}

	var files = fs.readdirSync(startPath);
	const zipfiles = files.filter(f => (path.extname(f).toLowerCase() === '.zip'));
	if (!zipfiles || zipfiles.length === 0) {
		throw new Error("no zip files found");
	} else {
		var zipfilename = path.join(startPath, zipfiles[0])
		const extracted = extractArchive(zipfilename);
		return extracted;
	}
};

async function extractArchive(filepath) {
	try {
		const zip = new AdmZip(filepath);
		// const outputDir = `./public/uploads/extracted/${path.parse(filepath).name}_extracted`;
		const outputDir = `./public/uploads/extracted/`;
		zip.extractAllTo(outputDir);
		// delete the zip file
		fs.unlinkSync(filepath);

		console.log(`Extracted to "${outputDir}" successfully`);
		return true;

	} catch (e) {
		console.log(`Something went wrong. ${e}`);
		return false;
	}
}

function importEntry(res) {
	try {
		const dir = './public/uploads/extracted/'
		const jsonfiles = fs.readdirSync(dir)

		for (const jsonfile of jsonfiles) {
			var entrydata = JSON.parse(fs.readFileSync(dir + jsonfile))

			console.log(jsonfile, entrydata.locale, entrydata.uid)
			var eLocale = entrydata.locale;
			var eUid = entrydata.uid;

			var data = new FormData();
			data.append('entry', fs.createReadStream(dir + jsonfile));

			var config = {
				method: 'post',
				// url: 'https://api.contentstack.io/v3/content_types/test_impot/entries/' + eUid + '/import?locale=' + eLocale,
				url: 'https://api.contentstack.io/v3/content_types/web_tiles/entries/' + eUid + '/import?locale=' + eLocale,
				headers: {
					'api_key': 'blt25772735bdf27ede',
					'authorization': 'cs775bb62b020eb66c78580ea6',
					...data.getHeaders()
				},
				data: data
			};

			axios(config)
				.then(function (response) {
					console.log(JSON.stringify(response.data));
					fs.unlinkSync(dir + jsonfile);
				})
				.catch(function (error) {
					res.status(500).send(error);
					// console.log(error);
				});
		}
	} catch (error) {
		throw new Error(error);
	}
}

module.exports = { getentry, fromDir, importEntry };

