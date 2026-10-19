-- CreateTable
CREATE TABLE `Users` (
    `user_id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('Admin', 'Creator') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Users_username_key`(`username`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Projects` (
    `project_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `project_name` VARCHAR(100) NOT NULL,
    `resolution` VARCHAR(20) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`project_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AI_Settings` (
    `setting_id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `language` VARCHAR(10) NOT NULL,
    `sensitivity_level` INTEGER NOT NULL,

    UNIQUE INDEX `AI_Settings_project_id_key`(`project_id`),
    PRIMARY KEY (`setting_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Media_ARoll` (
    `media_id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `duration` DOUBLE NOT NULL,
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`media_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transcripts` (
    `transcript_id` INTEGER NOT NULL AUTO_INCREMENT,
    `media_id` INTEGER NOT NULL,
    `text_content` TEXT NOT NULL,
    `start_time` DOUBLE NOT NULL,
    `end_time` DOUBLE NOT NULL,

    PRIMARY KEY (`transcript_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Extracted_Keywords` (
    `keyword_id` INTEGER NOT NULL AUTO_INCREMENT,
    `transcript_id` INTEGER NOT NULL,
    `keyword` VARCHAR(50) NOT NULL,

    PRIMARY KEY (`keyword_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `External_BRoll` (
    `b_roll_id` INTEGER NOT NULL AUTO_INCREMENT,
    `source_url` VARCHAR(500) NOT NULL,
    `provider` VARCHAR(50) NOT NULL,
    `search_query` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`b_roll_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Internal_Assets` (
    `asset_id` INTEGER NOT NULL AUTO_INCREMENT,
    `uploaded_by` INTEGER NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `description` TEXT NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `tags` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    FULLTEXT INDEX `Internal_Assets_title_description_tags_idx`(`title`, `description`, `tags`),
    PRIMARY KEY (`asset_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Timeline_EDL` (
    `edl_id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `track_layer` VARCHAR(10) NOT NULL,
    `start_pos` DOUBLE NOT NULL,
    `end_pos` DOUBLE NOT NULL,
    `b_roll_id` INTEGER NULL,
    `asset_id` INTEGER NULL,

    PRIMARY KEY (`edl_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `API_Configurations` (
    `config_id` INTEGER NOT NULL AUTO_INCREMENT,
    `provider_name` VARCHAR(50) NOT NULL,
    `api_key` VARCHAR(255) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`config_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExportJob` (
    `job_id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `resolution` VARCHAR(20) NOT NULL,
    `bitrate` VARCHAR(20) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `progress` DOUBLE NOT NULL DEFAULT 0,
    `file_path` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`job_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PipelineStatus` (
    `project_id` INTEGER NOT NULL,
    `stage` VARCHAR(50) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `error_message` TEXT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`project_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Projects` ADD CONSTRAINT `Projects_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `Users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AI_Settings` ADD CONSTRAINT `AI_Settings_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `Projects`(`project_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Media_ARoll` ADD CONSTRAINT `Media_ARoll_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `Projects`(`project_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transcripts` ADD CONSTRAINT `Transcripts_media_id_fkey` FOREIGN KEY (`media_id`) REFERENCES `Media_ARoll`(`media_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Extracted_Keywords` ADD CONSTRAINT `Extracted_Keywords_transcript_id_fkey` FOREIGN KEY (`transcript_id`) REFERENCES `Transcripts`(`transcript_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Internal_Assets` ADD CONSTRAINT `Internal_Assets_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `Users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Timeline_EDL` ADD CONSTRAINT `Timeline_EDL_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `Projects`(`project_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Timeline_EDL` ADD CONSTRAINT `Timeline_EDL_b_roll_id_fkey` FOREIGN KEY (`b_roll_id`) REFERENCES `External_BRoll`(`b_roll_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Timeline_EDL` ADD CONSTRAINT `Timeline_EDL_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `Internal_Assets`(`asset_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExportJob` ADD CONSTRAINT `ExportJob_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `Projects`(`project_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PipelineStatus` ADD CONSTRAINT `PipelineStatus_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `Projects`(`project_id`) ON DELETE CASCADE ON UPDATE CASCADE;
