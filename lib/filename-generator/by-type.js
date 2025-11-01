import path from 'path';
import {sanitizeFilename, getFilenameExtension, getFilenameFromUrl} from '../utils/index.js';
import typeExtensions from '../config/resource-ext-by-type.js';

export default function generateFilename (resource, {subdirectories, defaultFilename}, occupiedFileNames) {
	const occupiedNames = getSubDirectoryNames({subdirectories}).concat(occupiedFileNames);

	let filename = getFilenameForResource(resource, {subdirectories, defaultFilename});
	filename = sanitizeFilename(filename);

	const extension = getFilenameExtension(filename);
	const directory = getDirectoryByExtension(extension, {subdirectories, defaultFilename});

	let currentFilepath = path.join(directory, filename);
	const basename = path.basename(filename, extension);
	let index = 1;

	while (occupiedNames.includes(currentFilepath)) {
		currentFilepath = path.join(directory, `${basename}_${index}${extension}`);
		index++;
	}

	return currentFilepath;
}

function getFilenameForResource (resource, {defaultFilename}) {
	const preferredFilename = resource.getFilename();
	const urlFilename = getFilenameFromUrl(resource.getUrl());
	let filename = preferredFilename || urlFilename || defaultFilename;

	const resourceType = resource.getType();
	let extension = getFilenameExtension(filename);

	if (!extension && typeExtensions[resourceType]) {
		extension = typeExtensions[resourceType][0];
		filename += extension;
	}

	return filename;
}

function getSubDirectoryNames ({subdirectories}) {
	if (!subdirectories) {
		return [];
	}
	return subdirectories.map(subdirectory => subdirectory.directory);
}

function getDirectoryByExtension (extension, {subdirectories}) {
	if (!subdirectories) {
		return '';
	}

	const directories = subdirectories
		.filter(subdirectory => subdirectory.extensions.includes(extension))
		.map(subdirectory => subdirectory.directory);

	return directories.length ? directories[0] : '';
}
