const std = @import("std");
const wasm = @import("std").wasm;

pub fn main() anyerror!void {
    // Load the images
    const image1 = try load_image("image1.png");
    const image2 = try load_image("image2.png");

    // Compare the images
    const diff = compare_images(image1, image2);

    // Save the difference image
    try save_image("diff.png", diff);
}

fn load_image(path: []const u8) ![][]u8 {
    const image = std.fs.read_file(path)?;
    const loader = std.png.Loader.init(image.ptr, image.len);
    defer loader.deinit();
    const info = try loader.get_info();
    const width = info.width;
    const height = info.height;
    const stride = info.row_stride;
    const pixels = try allocator.alloc(u8, height * stride);
    try loader.read_image(pixels);
    return std.mem.arrayToSlices(u8, pixels, height, stride);
}

fn save_image(path: []const u8, image: [][]u8) !void {
    const height = image.len;
    const width = image[0].len;
    const stride = image[0].ptr + image[0].len - image[1].ptr;
    const pixels = std.mem.slicesToArray(u8, image);
    const encoder = std.png.Encoder.init(width, height);
    defer encoder.deinit();
    const out = try encoder.write(pixels, stride, std.os.File.tryCreate(path)?);
    try out.flush();
}

fn compare_images(image1: [][]u8, image2: [][]u8) [][]u8 {
    const height = image1.len;
    const width = image1[0].len;
    const diff = try allocator.allocSlice(u8, height, width);
    for (image1_row, image2_row, diff_row) in std.zip(image1, image2, diff) {
        for (image1_pixel, image2_pixel, diff_pixel) in std.zip(image1_row, image2_row, diff_row) {
            if (image1_pixel == image2_pixel) {
                diff_pixel = 0;
            } else {
                diff_pixel = 255;
            }
        }
    }
    return diff;
}

pub const EXPORTS = [_]wasm.Export{
    wasm.Export.Function {
        .name = "main",
        .type = wasm.FunctionType {
            .params = &[_]wasm.ValueType{},
            .results = &[_]wasm.ValueType{},
        },
        .func = main,
    },
};
