import { db } from "@/lib/db";
import { Prisma, User, Role } from "@prisma/client";
import { logger } from "@/lib/logger";
import { DatabaseError, NotFoundError, ConflictError } from "@/lib/errors/app-error";
import bcrypt from "bcryptjs";

/**
 * User Repository - Centralized data access for users
 */

export interface UserFilters {
  organizationId?: string;
  departmentId?: string;
  role?: Role;
  search?: string;
}

export class UserRepository {
  private readonly defaultSelect = {
    id: true,
    name: true,
    email: true,
    image: true,
    role: true,
    isSuperAdmin: true,
    organizationId: true,
    departmentId: true,
    createdAt: true,
    updatedAt: true,
    // Exclude password by default
  };

  async findById(userId: string, includePassword = false) {
    try {
      logger.database("Finding user by ID", { userId });

      const user = await db.user.findUnique({
        where: { id: userId },
        select: includePassword
          ? { ...this.defaultSelect, password: true }
          : this.defaultSelect,
      });

      if (!user) {
        throw new NotFoundError("User", userId);
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error("Error finding user by ID", error, { userId });
      throw new DatabaseError("Failed to fetch user");
    }
  }

  async findByEmail(email: string, includePassword = false) {
    try {
      logger.database("Finding user by email", { email });

      const user = await db.user.findUnique({
        where: { email },
        select: includePassword
          ? { ...this.defaultSelect, password: true }
          : this.defaultSelect,
      });

      return user;
    } catch (error) {
      logger.error("Error finding user by email", error, { email });
      throw new DatabaseError("Failed to fetch user");
    }
  }

  async findMany(filters: UserFilters, pagination?: { page: number; limit: number }) {
    try {
      logger.database("Finding users with filters", { filters, pagination });

      const where = this.buildWhereClause(filters);
      const skip = pagination ? (pagination.page - 1) * pagination.limit : undefined;
      const take = pagination?.limit;

      const [users, total] = await Promise.all([
        db.user.findMany({
          where,
          select: {
            ...this.defaultSelect,
            organization: {
              select: { id: true, name: true },
            },
            department: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
        db.user.count({ where }),
      ]);

      return {
        data: users,
        pagination: pagination
          ? {
              page: pagination.page,
              limit: pagination.limit,
              total,
              totalPages: Math.ceil(total / pagination.limit),
            }
          : undefined,
      };
    } catch (error) {
      logger.error("Error finding users", error, { filters });
      throw new DatabaseError("Failed to fetch users");
    }
  }

  async create(data: Prisma.UserCreateInput) {
    try {
      logger.database("Creating user", { email: data.email });

      // Check if user already exists
      const existing = await this.findByEmail(data.email);
      if (existing) {
        throw new ConflictError("User with this email already exists");
      }

      // Hash password if provided
      if (data.password) {
        data.password = await bcrypt.hash(data.password, 10);
      }

      const user = await db.user.create({
        data,
        select: this.defaultSelect,
      });

      logger.info("User created successfully", { userId: user.id });
      return user;
    } catch (error) {
      if (error instanceof ConflictError) throw error;
      logger.error("Error creating user", error, { email: data.email });
      throw new DatabaseError("Failed to create user");
    }
  }

  async update(userId: string, data: Prisma.UserUpdateInput) {
    try {
      logger.database("Updating user", { userId });

      // Hash password if being updated
      if (data.password && typeof data.password === "string") {
        data.password = await bcrypt.hash(data.password, 10);
      }

      const user = await db.user.update({
        where: { id: userId },
        data,
        select: this.defaultSelect,
      });

      logger.info("User updated successfully", { userId });
      return user;
    } catch (error) {
      logger.error("Error updating user", error, { userId });
      throw new DatabaseError("Failed to update user");
    }
  }

  async delete(userId: string) {
    try {
      logger.database("Deleting user", { userId });

      await db.user.delete({
        where: { id: userId },
      });

      logger.info("User deleted successfully", { userId });
    } catch (error) {
      logger.error("Error deleting user", error, { userId });
      throw new DatabaseError("Failed to delete user");
    }
  }

  async findByOrganization(organizationId: string) {
    try {
      return await db.user.findMany({
        where: { organizationId },
        select: this.defaultSelect,
        orderBy: { name: "asc" },
      });
    } catch (error) {
      logger.error("Error finding users by organization", error, { organizationId });
      throw new DatabaseError("Failed to fetch organization users");
    }
  }

  async verifyPassword(userId: string, password: string): Promise<boolean> {
    try {
      const user = await this.findById(userId, true);
      if (!user.password) return false;
      return await bcrypt.compare(password, user.password);
    } catch (error) {
      logger.error("Error verifying password", error, { userId });
      return false;
    }
  }

  private buildWhereClause(filters: UserFilters): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};

    if (filters.organizationId) {
      where.organizationId = filters.organizationId;
    }

    if (filters.departmentId) {
      where.departmentId = filters.departmentId;
    }

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { email: { contains: filters.search } },
      ];
    }

    return where;
  }
}

// Singleton instance
export const userRepository = new UserRepository();
