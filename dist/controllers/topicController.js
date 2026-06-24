"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTopic = exports.updateTopic = exports.createTopic = exports.getTopicById = void 0;
const db_1 = require("../utils/db");
const cloudinary_1 = require("../utils/cloudinary");
// GET /api/topics/:id
const getTopicById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const topic = yield db_1.prisma.topic.findUnique({
            where: { id: id },
            include: {
                video: true,
                mcqs: {
                    include: {
                        options: true
                    }
                },
                interviewQs: true,
                module: {
                    select: {
                        id: true,
                        title: true,
                        courseId: true
                    }
                }
            }
        });
        if (!topic) {
            return res.status(404).json({ message: 'Topic not found' });
        }
        res.status(200).json(topic);
    }
    catch (error) {
        console.error('GetTopicById error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getTopicById = getTopicById;
// POST /api/topics
const createTopic = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, description, moduleId, mcqs, interviewQuestions } = req.body;
        if (!title || !moduleId) {
            return res.status(400).json({ message: 'Title and moduleId are required' });
        }
        let videoUrl = req.body.videoUrl || '';
        let pdfUrl = req.body.pdfUrl || '';
        let cheatsheetUrl = req.body.cheatsheetUrl || '';
        // If pre-uploaded URLs are not provided, upload files directly (fallback)
        const files = req.files;
        if (files) {
            if (!videoUrl && files['video'] && files['video'].length > 0) {
                videoUrl = yield (0, cloudinary_1.uploadToCloudinary)(files['video'][0].path, 'topics/videos', 'video');
            }
            if (!pdfUrl && files['pdf'] && files['pdf'].length > 0) {
                pdfUrl = yield (0, cloudinary_1.uploadToCloudinary)(files['pdf'][0].path, 'topics/pdfs', 'image');
            }
            if (!cheatsheetUrl && files['cheatsheet'] && files['cheatsheet'].length > 0) {
                cheatsheetUrl = yield (0, cloudinary_1.uploadToCloudinary)(files['cheatsheet'][0].path, 'topics/pdfs', 'image');
            }
        }
        // Parse JSON
        let parsedMcqs = [];
        let parsedInterviewQs = [];
        try {
            if (mcqs)
                parsedMcqs = JSON.parse(mcqs);
            if (interviewQuestions)
                parsedInterviewQs = JSON.parse(interviewQuestions);
        }
        catch (e) {
            console.warn("Could not parse mcqs or interviewQuestions", e);
        }
        const result = yield db_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const topic = yield tx.topic.create({
                data: {
                    title,
                    description: description || '',
                    moduleId,
                    pdfUrl: pdfUrl || null,
                    cheatsheetUrl: cheatsheetUrl || null
                }
            });
            if (videoUrl) {
                yield tx.video.create({
                    data: {
                        title: title + " Video",
                        duration: "0:00",
                        videoUrl: videoUrl,
                        topicId: topic.id
                    }
                });
            }
            if (parsedInterviewQs && parsedInterviewQs.length > 0) {
                for (const iq of parsedInterviewQs) {
                    if (iq.question) {
                        yield tx.interviewQuestion.create({
                            data: {
                                question: iq.question,
                                hints: iq.hints || [],
                                topicId: topic.id
                            }
                        });
                    }
                }
            }
            if (parsedMcqs && parsedMcqs.length > 0) {
                for (const mcq of parsedMcqs) {
                    if (mcq.question) {
                        const createdMcq = yield tx.mCQQuestion.create({
                            data: {
                                question: mcq.question,
                                explanation: mcq.explanation || '',
                                topicId: topic.id
                            }
                        });
                        if (mcq.options && Array.isArray(mcq.options)) {
                            for (const opt of mcq.options) {
                                const option = yield tx.mCQOption.create({
                                    data: {
                                        text: opt.text,
                                        questionId: createdMcq.id
                                    }
                                });
                                if (opt.id === mcq.correctOptionId) {
                                    yield tx.mCQQuestion.update({
                                        where: { id: createdMcq.id },
                                        data: { correctOptionId: option.id }
                                    });
                                }
                            }
                        }
                    }
                }
            }
            return topic;
        }));
        res.status(201).json({ message: 'Topic created successfully', topic: result });
    }
    catch (error) {
        console.error('CreateTopic error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.createTopic = createTopic;
// PUT /api/topics/:id
const updateTopic = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { title, description } = req.body;
        let pdfUrl = req.body.pdfUrl;
        let cheatsheetUrl = req.body.cheatsheetUrl;
        const files = req.files;
        if (files) {
            if (files['pdf'] && files['pdf'].length > 0) {
                pdfUrl = yield (0, cloudinary_1.uploadToCloudinary)(files['pdf'][0].path, 'topics/pdfs', 'image');
            }
            if (files['cheatsheet'] && files['cheatsheet'].length > 0) {
                cheatsheetUrl = yield (0, cloudinary_1.uploadToCloudinary)(files['cheatsheet'][0].path, 'topics/pdfs', 'image');
            }
        }
        const existingTopic = yield db_1.prisma.topic.findUnique({ where: { id: id } });
        if (!existingTopic) {
            return res.status(404).json({ message: 'Topic not found' });
        }
        const updatedTopic = yield db_1.prisma.topic.update({
            where: { id: id },
            data: Object.assign(Object.assign(Object.assign(Object.assign({}, (title && { title })), (description !== undefined && { description })), (pdfUrl !== undefined && { pdfUrl })), (cheatsheetUrl !== undefined && { cheatsheetUrl }))
        });
        res.status(200).json({ message: 'Topic updated successfully', topic: updatedTopic });
    }
    catch (error) {
        console.error('UpdateTopic error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.updateTopic = updateTopic;
// DELETE /api/topics/:id
const deleteTopic = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existingTopic = yield db_1.prisma.topic.findUnique({ where: { id: id } });
        if (!existingTopic) {
            return res.status(404).json({ message: 'Topic not found' });
        }
        yield db_1.prisma.topic.delete({ where: { id: id } });
        res.status(200).json({ message: 'Topic deleted successfully' });
    }
    catch (error) {
        console.error('DeleteTopic error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.deleteTopic = deleteTopic;
