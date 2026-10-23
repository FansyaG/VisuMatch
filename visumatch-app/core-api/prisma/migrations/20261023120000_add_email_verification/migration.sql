-- AlterTable
ALTER TABLE `Users` ADD COLUMN `email` VARCHAR(255) NULL,
    ADD COLUMN `email_verified_at` DATETIME(0) NULL;

-- CreateTable
CREATE TABLE `Email_Verifications` (
    `verification_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `code_hash` VARCHAR(255) NOT NULL,
    `purpose` VARCHAR(30) NOT NULL DEFAULT 'verify_email',
    `expires_at` DATETIME(0) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `consumed_at` DATETIME(0) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Email_Verifications_user_id_idx`(`user_id`),
    PRIMARY KEY (`verification_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Users_email_key` ON `Users`(`email`);

-- AddForeignKey
ALTER TABLE `Email_Verifications` ADD CONSTRAINT `Email_Verifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `Users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;
